import { isAddress } from "viem";
import { describe, expect, it } from "vitest";
import { processPasskeyPrf } from "./processPasskeyPrf";

// Fixed PRF buffer fixtures (BufferSource) for deterministic derivation checks.
// No return annotation: let TS infer `Uint8Array<ArrayBuffer>` (assignable to
// `BufferSource`); an explicit `: Uint8Array` widens to `ArrayBufferLike`.
const fixedPrf = () => new Uint8Array(32).fill(7);
const otherPrf = () => new Uint8Array(32).fill(9);

describe("processPasskeyPrf", () => {
  it("returns the expected shape: { r, s, prfAddress }", async () => {
    const result = await processPasskeyPrf(fixedPrf());

    expect(Object.keys(result).sort()).toEqual(["prfAddress", "r", "s"]);
    expect(typeof result.r).toBe("bigint");
    expect(typeof result.s).toBe("bigint");
    expect(typeof result.prfAddress).toBe("string");
    expect(isAddress(result.prfAddress)).toBe(true);
    expect(result.prfAddress.startsWith("0x")).toBe(true);
  });

  it("is deterministic for a fixed PRF buffer", async () => {
    const a = await processPasskeyPrf(fixedPrf());
    const b = await processPasskeyPrf(fixedPrf());

    expect(a.prfAddress).toBe(b.prfAddress);
    expect(a.r).toBe(b.r);
    expect(a.s).toBe(b.s);
  });

  it("derives distinct keys/addresses for distinct PRF buffers", async () => {
    const a = await processPasskeyPrf(fixedPrf());
    const c = await processPasskeyPrf(otherPrf());

    expect(c.prfAddress).not.toBe(a.prfAddress);
    // Different private key => signature components differ as well.
    expect(c.r === a.r && c.s === a.s).toBe(false);
  });

  it("accepts an ArrayBuffer BufferSource equivalently to its Uint8Array view", async () => {
    const view = fixedPrf();
    const fromView = await processPasskeyPrf(view);
    // Same underlying bytes passed as a raw ArrayBuffer.
    const fromBuffer = await processPasskeyPrf(view.buffer);

    expect(fromBuffer.prfAddress).toBe(fromView.prfAddress);
    expect(fromBuffer.r).toBe(fromView.r);
    expect(fromBuffer.s).toBe(fromView.s);
  });

  it("accepts a Base64 auth-callback value equivalently to its Uint8Array bytes", async () => {
    const view = fixedPrf();
    const base64 = btoa(String.fromCharCode(...view));
    const fromView = await processPasskeyPrf(view);
    const fromBase64 = await processPasskeyPrf(base64);

    expect(fromBase64.prfAddress).toBe(fromView.prfAddress);
    expect(fromBase64.r).toBe(fromView.r);
    expect(fromBase64.s).toBe(fromView.s);
  });

  it("rejects malformed input before calling WebCrypto", async () => {
    // @ts-expect-error intentionally passing an invalid input type
    await expect(processPasskeyPrf({})).rejects.toThrow(
      "Passkey PRF value must be a BufferSource or a valid Base64 string.",
    );
    await expect(processPasskeyPrf("dG9vIHNob3J0")).rejects.toThrow("Passkey PRF value must contain exactly 32 bytes.");
  });
});
