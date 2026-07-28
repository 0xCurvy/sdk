import { sha256 } from "@noble/hashes/sha2.js";
import { describe, expect, it } from "vitest";
import { IX_DISC, RECOVER_SOL_DISC, RECOVER_SPL_DISC } from "@/constants/solana";

/**
 * Anchor derives every instruction discriminator from `sha256("global:<snake_case_name>")`.
 * These assertions pin each hardcoded constant to the exact on-chain instruction name, so
 * renaming an instruction in `lib.rs` without updating the SDK breaks here instead of
 * on mainnet.
 *
 * Source of truth: packages/contracts/solana/programs/curvy-portal/src/lib.rs
 */
const ON_CHAIN_NAMES = {
  bridgeRelaySol: "bridge_relay_sol",
  bridgeRelaySpl: "bridge_relay_spl",
  bridgeAcrossSol: "bridge_sol",
  bridgeAcrossSpl: "bridge_spl",
  bridgeEcoSpl: "bridge_eco_spl",
} as const satisfies Record<keyof typeof IX_DISC, string>;

const discriminatorOf = (name: string) => sha256(new TextEncoder().encode(`global:${name}`)).slice(0, 8);

describe("curvy-portal instruction discriminators", () => {
  it.each(Object.entries(ON_CHAIN_NAMES))("%s maps to the on-chain instruction %s", (key, onChainName) => {
    expect(IX_DISC[key as keyof typeof IX_DISC]).toEqual(Uint8Array.from(discriminatorOf(onChainName)));
  });

  it("pins the recovery instruction discriminators", () => {
    expect(RECOVER_SOL_DISC).toEqual(Uint8Array.from(discriminatorOf("recover_sol")));
    expect(RECOVER_SPL_DISC).toEqual(Uint8Array.from(discriminatorOf("recover_spl")));
  });

  it("keeps every discriminator distinct", () => {
    const seen = Object.values(IX_DISC).map((disc) => disc.join(","));
    expect(new Set(seen).size).toBe(seen.length);
  });
});
