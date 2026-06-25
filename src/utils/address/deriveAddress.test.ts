import { describe, expect, it } from "vitest";
import { deriveAddress } from "./deriveAddress";

// secp256k1 generator point G (== pubkey for private key 1). Its EVM address is
// the well-known 0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf.
const G =
  "55066263022277343669578718895168534326250603453777594175500187360389116729240.32670510020758816978083085130507043184471273380659243275938904335757337482424";

describe("deriveAddress", () => {
  it("derives the canonical EVM address for the generator point", () => {
    expect(deriveAddress(G, "evm")).toBe("0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf");
  });

  it("is deterministic for EVM", () => {
    expect(deriveAddress(G, "evm")).toBe(deriveAddress(G, "evm"));
  });

  it("derives the base58 Solana recovery pubkey for the generator point", () => {
    expect(deriveAddress(G, "solana")).toBe("7AMVqK9evj3YaWbfdV2fzdckJW6Q7vMphkQKcEEVET4T");
  });

  it("throws when the public key is missing", () => {
    expect(() => deriveAddress(undefined, "evm")).toThrow(/Missing public key or network flavour/);
  });

  it("throws when the flavour is missing", () => {
    expect(() => deriveAddress(G, undefined)).toThrow(/Missing public key or network flavour/);
  });
});
