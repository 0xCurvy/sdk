import { describe, expect, it } from "vitest";
import { signMessage } from "./signMessage";

// 32-byte secp256k1 private key WITHOUT 0x prefix (signMessage prepends it).
const KEY = "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

describe("signMessage", () => {
  it("is deterministic for a fixed key + message (ECDSA over EIP-191 digest)", () => {
    const a = signMessage("hello", KEY);
    const b = signMessage("hello", KEY);
    expect(a).toBe(b);
  });

  it("matches the known serialized signature for the fixed vector", () => {
    expect(signMessage("hello", KEY)).toBe(
      "0x76930d64d2e5eb4b3f4572ce806eda50e1e2329d51d9ca5a713a9befcb9d20883e3d4885c3c5eaf775fc8c9fcf4882a28b582b427bc0270565f3294d935549221b",
    );
  });

  it("produces a 65-byte (0x + 130 hex) signature", () => {
    expect(signMessage("hello", KEY)).toMatch(/^0x[0-9a-f]{130}$/);
  });

  it("differs for different messages under the same key", () => {
    expect(signMessage("hello", KEY)).not.toBe(signMessage("goodbye", KEY));
  });
});
