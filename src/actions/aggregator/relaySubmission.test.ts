import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "@/errors";
import { popPrivateToken } from "@/privacy-pass/tokens";
import { createFakeApi, createFakeConfig, fixtureNetwork } from "@/test/fixtures";
import { relaySubmission } from "./relaySubmission";
import type { AggregatorSubmission } from "./types";

vi.mock("@/privacy-pass/tokens", () => ({
  popPrivateToken: vi.fn(),
}));

const popMock = vi.mocked(popPrivateToken);

const request: AggregatorSubmission = {
  action: "aggregation",
  networkSlug: "ethereum",
  contractArg: 2,
  proof: {
    proofA: [1n, 2n],
    proofB: [
      [3n, 4n],
      [5n, 6n],
    ],
    proofC: [7n, 8n],
  } as AggregatorSubmission["proof"],
  publicSignals: [9n, 10n],
  nullifiers: [11n],
};

function buildConfig(submitProof: ReturnType<typeof vi.fn>) {
  const api = createFakeApi({ relay: { SubmitProof: submitProof } });
  return createFakeConfig({ api, networks: [fixtureNetwork({ slug: "ethereum", chainId: "1" })] });
}

describe("relaySubmission — privacy pass attach + retry", () => {
  beforeEach(() => {
    popMock.mockReset();
  });

  it("attaches a popped token as the second SubmitProof argument", async () => {
    popMock.mockResolvedValueOnce("PrivateToken token=t1");
    const submitProof = vi.fn(async (_body: unknown, _token?: string) => ({
      requestId: "r1",
      status: "queued",
      networkId: 1,
    }));
    const config = buildConfig(submitProof);

    const result = await relaySubmission({ config, request });

    expect(result.requestId).toBe("r1");
    expect(submitProof).toHaveBeenCalledTimes(1);
    expect(submitProof.mock.calls[0][1]).toBe("PrivateToken token=t1");
  });

  it("submits tokenless when tokens are off/unavailable", async () => {
    popMock.mockResolvedValueOnce(undefined);
    const submitProof = vi.fn(async (_body: unknown, _token?: string) => ({
      requestId: "r1",
      status: "queued",
      networkId: 1,
    }));
    const config = buildConfig(submitProof);

    await relaySubmission({ config, request });

    expect(submitProof.mock.calls[0][1]).toBeUndefined();
  });

  it("retries ONCE with a fresh token on 401, then succeeds", async () => {
    popMock.mockResolvedValueOnce("PrivateToken token=stale");
    popMock.mockResolvedValueOnce("PrivateToken token=fresh");
    const submitProof = vi
      .fn()
      .mockRejectedValueOnce(new APIError("unauthorized", 401, undefined, "req-1"))
      .mockResolvedValueOnce({ requestId: "r2", status: "queued", networkId: 1 });
    const config = buildConfig(submitProof);

    const result = await relaySubmission({ config, request });

    expect(result.requestId).toBe("r2");
    expect(submitProof).toHaveBeenCalledTimes(2);
    expect(submitProof.mock.calls[1][1]).toBe("PrivateToken token=fresh");
    // The retry re-bootstraps the scope (challenge may have rotated).
    expect(popMock).toHaveBeenLastCalledWith(config, "relayer", { forceRefresh: true });
  });

  it("does not retry non-auth failures", async () => {
    popMock.mockResolvedValue("PrivateToken token=t1");
    const submitProof = vi.fn().mockRejectedValue(new APIError("bad request", 400, undefined, "req-1"));
    const config = buildConfig(submitProof);

    await expect(relaySubmission({ config, request })).rejects.toMatchObject({ name: "RelayError" });
    expect(submitProof).toHaveBeenCalledTimes(1);
  });

  it("recovers by stable intent id when the POST response is lost", async () => {
    popMock.mockResolvedValue(undefined);
    const submitProof = vi.fn().mockRejectedValue(new Error("response reset"));
    const getByIntent = vi.fn().mockResolvedValue({ requestId: "r-recovered", status: "queued", networkId: 1 });
    const api = createFakeApi({
      relay: { SubmitProof: submitProof, GetSubmissionByIntent: getByIntent },
    });
    const config = createFakeConfig({ api, networks: [fixtureNetwork({ slug: "ethereum", chainId: "1" })] });
    const intentId = "00000000-0000-4000-8000-000000000777";

    const result = await relaySubmission({ config, request, intentId });

    expect(result.requestId).toBe("r-recovered");
    expect(getByIntent).toHaveBeenCalledWith(intentId, 1);
  });
});
