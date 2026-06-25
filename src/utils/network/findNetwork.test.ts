import { describe, expect, it } from "vitest";
import { fixtureNetwork } from "@/test/fixtures";
import type { Network } from "@/types/api";
import { findNetwork } from "@/utils/network/findNetwork";

const networks: Network[] = [
  fixtureNetwork({ id: 1, name: "Ethereum Sepolia", slug: "ethereum-sepolia", testnet: true }),
  fixtureNetwork({ id: 2, name: "Starknet Sepolia", slug: "starknet-sepolia", testnet: true }),
  fixtureNetwork({ id: 3, name: "Ethereum", slug: "ethereum", testnet: false }),
];

describe("findNetwork", () => {
  it("returns the single matching network", () => {
    expect(findNetwork(networks, 2)).toEqual(networks[1]);
    expect(findNetwork(networks, "ethereum")).toEqual(networks[2]);
  });

  it("returns undefined when nothing matches", () => {
    expect(findNetwork(networks, 999)).toBeUndefined();
    expect(findNetwork(networks, "does-not-exist")).toBeUndefined();
  });

  it("throws when the filter matches more than one network", () => {
    // The boolean `true` matches both testnets.
    expect(() => findNetwork(networks, true)).toThrow("More than one network found");
  });
});
