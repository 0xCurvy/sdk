import { describe, expect, it } from "vitest";
import { bufferSourceToBuffer } from "./bufferSourceToBuffer";

describe("bufferSourceToBuffer", () => {
  it("converts an ArrayBuffer to a Buffer with the same bytes", () => {
    const src = new Uint8Array([1, 2, 3]).buffer;
    const buf = bufferSourceToBuffer(src);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect([...buf]).toEqual([1, 2, 3]);
  });

  it("converts a typed-array view to a Buffer with the same bytes", () => {
    const buf = bufferSourceToBuffer(new Uint8Array([4, 5, 6]));
    expect([...buf]).toEqual([4, 5, 6]);
  });

  it("respects the view's byte offset and length", () => {
    const backing = new Uint8Array([0, 1, 2, 3, 4, 5]);
    const view = new Uint8Array(backing.buffer, 2, 3); // [2, 3, 4]
    const buf = bufferSourceToBuffer(view);
    expect([...buf]).toEqual([2, 3, 4]);
  });

  it("throws for a non-BufferSource argument", () => {
    // @ts-expect-error intentionally passing an invalid argument
    expect(() => bufferSourceToBuffer("not a buffer")).toThrow("Argument is not a valid BufferSource");
  });
});
