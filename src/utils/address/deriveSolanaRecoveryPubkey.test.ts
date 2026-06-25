import { describe, expect, it } from "vitest";
import { deriveSolanaRecoveryPubkey } from "./deriveSolanaRecoveryPubkey";

// secp256k1 generator point G in "X.Y" decimal-coordinate format.
const G =
  "55066263022277343669578718895168534326250603453777594175500187360389116729240.32670510020758816978083085130507043184471273380659243275938904335757337482424";

describe("deriveSolanaRecoveryPubkey", () => {
  it("derives the known base58 recovery pubkey for a fixed input", () => {
    expect(deriveSolanaRecoveryPubkey(G)).toBe("7AMVqK9evj3YaWbfdV2fzdckJW6Q7vMphkQKcEEVET4T");
  });

  it("is deterministic", () => {
    expect(deriveSolanaRecoveryPubkey(G)).toBe(deriveSolanaRecoveryPubkey(G));
  });

  it("distinguishes even-Y and odd-Y points sharing the same X (compression prefix)", () => {
    expect(deriveSolanaRecoveryPubkey("1.3")).not.toBe(deriveSolanaRecoveryPubkey("1.4"));
    expect(deriveSolanaRecoveryPubkey("1.3")).toBe("E2kfcYAwjXWNrYtRiSiQSnRA7LpS6pDJxsjkjhobSG3U");
    expect(deriveSolanaRecoveryPubkey("1.4")).toBe("BiV9abtDEfS8EdcrTdJmVhqL5Uve8szE49p4aQWYx3Ey");
  });

  it("throws on an empty public key", () => {
    expect(() => deriveSolanaRecoveryPubkey("")).toThrow(/Missing public key/);
  });

  it("throws when the X.Y format is malformed (missing Y)", () => {
    expect(() => deriveSolanaRecoveryPubkey("12345")).toThrow(/Invalid public key format/);
  });
});
