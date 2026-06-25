import { describe, expect, it } from "vitest";
import type { Network } from "@/types/api";
import { findCurrency } from "./findCurrency";

const networks = [
  {
    name: "Ethereum",
    currencies: [
      { symbol: "USDC", contractAddress: "0xAAA", vaultTokenId: "42" },
      { symbol: "WETH", contractAddress: "0xBBB", vaultTokenId: "7" },
    ],
  },
  {
    name: "Base",
    currencies: [{ symbol: "USDC", contractAddress: "0xCCC", vaultTokenId: "99" }],
  },
] as unknown as Network[];

describe("findCurrency", () => {
  it("finds by contract address (case-insensitive) scoped to the network slug", () => {
    const hit = findCurrency(networks, "0xaaa", "ethereum");
    expect(hit?.currency.symbol).toBe("USDC");
    expect(hit?.network.name).toBe("Ethereum");
  });

  it("finds by vault token id (bigint)", () => {
    const hit = findCurrency(networks, 7n, "ethereum");
    expect(hit?.currency.symbol).toBe("WETH");
  });

  it("scopes the lookup to the requested network", () => {
    const hit = findCurrency(networks, "0xccc", "base");
    expect(hit?.currency.symbol).toBe("USDC");
    expect(hit?.network.name).toBe("Base");
  });

  it("returns undefined when the currency or network is not found", () => {
    expect(findCurrency(networks, "0xzzz", "ethereum")).toBeUndefined();
    expect(findCurrency(networks, "0xaaa", "polygon")).toBeUndefined();
  });
});
