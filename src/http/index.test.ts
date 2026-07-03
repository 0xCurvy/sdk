import { describe, expect, it, vi } from "vitest";
import { APIError } from "@/errors";
import { HttpClient } from "./index";

/** Minimal `Response`-like stub. */
function res(status: number, body: unknown = {}): Response {
  return {
    status,
    statusText: `status ${status}`,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response;
}

/** Exposes the protected `request` for testing and lets tests set a bearer token. */
class TestClient extends HttpClient {
  call(opts: {
    method: string;
    path: string;
    retries?: number;
    retryDelay?: number;
    retryableStatusCodes?: number[];
    auth?: "bearer" | "none";
    headers?: Record<string, string>;
  }) {
    return this.request<{ ok?: boolean } | null>(opts);
  }
  setToken(token: string | undefined) {
    this._updateBearerToken(token);
  }
}

const asFetch = (fn: unknown) => fn as unknown as typeof globalThis.fetch;

describe("HttpClient retry + backoff", () => {
  it("returns on success without retrying, and sends an X-Request-ID header", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => res(200, { ok: true }));
    const client = new TestClient("https://api.test", asFetch(fetchMock));

    expect(await client.call({ method: "GET", path: "/x" })).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers["X-Request-ID"]).toMatch(/[0-9a-f-]{36}/);
  });

  it("retries retryable 5xx and then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(res(503))
      .mockResolvedValueOnce(res(200, { ok: true }));
    const client = new TestClient("https://api.test", asFetch(fetchMock));

    expect(await client.call({ method: "GET", path: "/x", retries: 3, retryDelay: 1 })).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries on a persistent 503", async () => {
    const fetchMock = vi.fn(async () => res(503));
    const client = new TestClient("https://api.test", asFetch(fetchMock));

    await expect(client.call({ method: "GET", path: "/x", retries: 2, retryDelay: 1 })).rejects.toBeInstanceOf(
      APIError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("does not retry non-retryable status codes", async () => {
    const fetchMock = vi.fn(async () => res(400));
    const client = new TestClient("https://api.test", asFetch(fetchMock));

    await expect(client.call({ method: "GET", path: "/x", retries: 3, retryDelay: 1 })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries network errors (no status code) then surfaces an APIError", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(res(200, { ok: true }));
    const client = new TestClient("https://api.test", asFetch(fetchMock));

    expect(await client.call({ method: "GET", path: "/x", retries: 1, retryDelay: 1 })).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fires onUnauthorized for a bearer-authenticated 401 (and does not retry it)", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => res(401));
    const client = new TestClient("https://api.test", asFetch(fetchMock));
    client.setToken("tok");
    const onUnauthorized = vi.fn();
    client.setOnUnauthorized(onUnauthorized);

    await expect(
      client.call({ method: "GET", path: "/x", retries: 3, retryDelay: 1, auth: "bearer" }),
    ).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok");
    expect(onUnauthorized).toHaveBeenCalledWith(401, expect.any(String));
  });

  it("never attaches the bearer token unless auth: 'bearer' is requested", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => res(200, { ok: true }));
    const client = new TestClient("https://api.test", asFetch(fetchMock));
    client.setToken("tok");
    const onUnauthorized = vi.fn();
    client.setOnUnauthorized(onUnauthorized);

    await client.call({ method: "GET", path: "/x" });
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();

    // A 401 on a token-less request must not trigger the re-auth signal either.
    fetchMock.mockResolvedValueOnce(res(401));
    await expect(client.call({ method: "GET", path: "/x" })).rejects.toMatchObject({ statusCode: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("passes extra headers through (PrivateToken attach path)", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => res(200, { ok: true }));
    const client = new TestClient("https://api.test", asFetch(fetchMock));
    client.setToken("tok");

    await client.call({ method: "POST", path: "/x", headers: { Authorization: "PrivateToken token=abc" } });
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("PrivateToken token=abc");
  });

  it("does not fire onUnauthorized for a 401 on an unauthenticated request", async () => {
    const fetchMock = vi.fn(async () => res(401));
    const client = new TestClient("https://api.test", asFetch(fetchMock));
    const onUnauthorized = vi.fn();
    client.setOnUnauthorized(onUnauthorized);

    await expect(client.call({ method: "GET", path: "/x" })).rejects.toMatchObject({ statusCode: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("throws a structured APIError when a 2xx body is not valid JSON", async () => {
    const fetchMock = vi.fn(async () => res(200, "definitely not json"));
    const client = new TestClient("https://api.test", asFetch(fetchMock));

    await expect(client.call({ method: "GET", path: "/x" })).rejects.toMatchObject({
      statusCode: 200,
      responseBody: "definitely not json",
    });
  });
});
