import { describe, expect, it } from "vitest";
import { fixtureNetwork } from "@/test/fixtures";
import type { Network } from "@/types/api";
import { filterNetworks } from "@/utils/network/filterNetworks";

// Migrated from the legacy tests/network-filter.test.ts (which was @ts-nocheck
// and hand-rolled stale Network objects). Rebuilt on the shared `fixtureNetwork`
// helper and extended to cover every NetworkFilter variant, including the cases
// the legacy file left as a TODO (string[]/number[]/callback/undefined).

const networks: Network[] = [
  fixtureNetwork({ id: 1, name: "Ethereum Sepolia", slug: "ethereum-sepolia", testnet: true }),
  fixtureNetwork({ id: 2, name: "Starknet Sepolia", slug: "starknet-sepolia", testnet: true }),
  fixtureNetwork({ id: 3, name: "Ethereum", slug: "ethereum", testnet: false }),
];

describe("filterNetworks", () => {
  it("returns all networks for undefined", () => {
    expect(filterNetworks(networks, undefined)).toEqual(networks);
  });

  it("filters by slug string", () => {
    const matched = filterNetworks(networks, "ethereum-sepolia");
    expect(matched).toHaveLength(1);
    expect(matched[0]).toEqual(networks[0]);

    // An empty string slugifies to "" and matches nothing.
    expect(filterNetworks(networks, "")).toHaveLength(0);
  });

  it("matches a slug regardless of casing/spacing via toSlug", () => {
    const matched = filterNetworks(networks, "Ethereum Sepolia");
    expect(matched).toHaveLength(1);
    expect(matched[0].id).toBe(1);
  });

  it("filters by numeric id", () => {
    const matched = filterNetworks(networks, 1);
    expect(matched).toHaveLength(1);
    expect(matched[0].id).toBe(1);

    expect(filterNetworks(networks, 100)).toHaveLength(0);
  });

  it("filters by numeric-string id", () => {
    for (const id of ["1", "1.0"]) {
      const matched = filterNetworks(networks, id);
      expect(matched, `${id} should match the network with id 1`).toHaveLength(1);
      expect(matched[0].id).toBe(1);
    }

    for (const id of ["100", "100.0"]) {
      expect(filterNetworks(networks, id), `${id} should match nothing`).toHaveLength(0);
    }
  });

  it("filters by a string array of slugs", () => {
    const matched = filterNetworks(networks, ["ethereum-sepolia", "ethereum"]);
    expect(matched).toHaveLength(2);
    expect(matched.map((n) => n.id)).toEqual([1, 3]);

    expect(filterNetworks(networks, [])).toHaveLength(0);
  });

  it("filters by a number array of ids", () => {
    const matched = filterNetworks(networks, [1, 3]);
    expect(matched).toHaveLength(2);
    expect(matched.map((n) => n.id)).toEqual([1, 3]);
  });

  it("filters testnets and mainnets via boolean", () => {
    const testnets = filterNetworks(networks, true);
    expect(testnets).toHaveLength(2);
    expect(testnets.map((n) => n.id)).toEqual([1, 2]);

    const mainnets = filterNetworks(networks, false);
    expect(mainnets).toHaveLength(1);
    expect(mainnets[0].id).toBe(3);
  });

  it("filters with a callback predicate", () => {
    const matched = filterNetworks(networks, (network) => network.name.startsWith("Starknet"));
    expect(matched).toHaveLength(1);
    expect(matched[0].id).toBe(2);
  });
});
