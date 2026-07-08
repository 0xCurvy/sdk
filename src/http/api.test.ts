import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "./api";

/** Minimal `Response`-like stub (mirrors http/index.test.ts). */
function res(status: number, body: unknown = { data: [] }): Response {
  return {
    status,
    statusText: `status ${status}`,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response;
}

const asFetch = (fn: unknown) => fn as unknown as typeof globalThis.fetch;

function makeClient(baseUrls?: { metadataBaseUrl?: string; indexerBaseUrl?: string; relayerBaseUrl?: string }) {
  const urls: string[] = [];
  const fetchMock = vi.fn(async (url: string) => {
    urls.push(url);
    return res(200);
  });
  const api = new ApiClient("https://api.test", asFetch(fetchMock), baseUrls);
  return { api, urls };
}

describe("ApiClient per-route-group base URL selection", () => {
  it("routes metadata/indexer/relayer groups to their configured base URLs", async () => {
    const { api, urls } = makeClient({
      metadataBaseUrl: "https://meta.test",
      indexerBaseUrl: "https://indexer.test",
      relayerBaseUrl: "https://relay.test",
    });

    await api.network.GetNetworks(); // metadata group
    await api.sync.GetNotes(1, 0); // indexer group
    await api.relay.GetPaymasterInfo(); // relayer group
    await api.portal.GetPortalRecords(); // default (apiBaseUrl)

    expect(urls[0].startsWith("https://meta.test/")).toBe(true);
    expect(urls[1].startsWith("https://indexer.test/")).toBe(true);
    expect(urls[2].startsWith("https://relay.test/")).toBe(true);
    expect(urls[3].startsWith("https://api.test/")).toBe(true);
  });

  it("falls back to apiBaseUrl for every group when no per-service URL is set", async () => {
    const { api, urls } = makeClient();

    await api.network.GetNetworks();
    await api.sync.GetNotes(1, 0);
    await api.relay.GetPaymasterInfo();

    expect(urls.every((u) => u.startsWith("https://api.test/"))).toBe(true);
  });
});
