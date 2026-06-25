import { describe, expect, it } from "vitest";
import { decimalStringToHex } from "./decimalStringToHex";

describe("decimalStringToHex", () => {
  it("zero-pads each half to 64 chars with the uncompressed '04' prefix by default", () => {
    const hex = decimalStringToHex("1.2");
    expect(hex).toBe(`04${"0".repeat(63)}1${"0".repeat(63)}2`);
    expect(hex.length).toBe(2 + 64 + 64);
  });

  it("uses a '0x' prefix when uncompressed is false", () => {
    const hex = decimalStringToHex("1.2", false);
    expect(hex).toBe(`0x${"0".repeat(63)}1${"0".repeat(63)}2`);
  });

  it("is deterministic", () => {
    expect(decimalStringToHex("12.34")).toBe(decimalStringToHex("12.34"));
  });

  it("throws when the public key is empty", () => {
    expect(() => decimalStringToHex("")).toThrow(/Public key is required/);
  });

  it("throws on an invalid (non X.Y) format", () => {
    expect(() => decimalStringToHex("nope")).toThrow(/Invalid public key format/);
    expect(() => decimalStringToHex("1")).toThrow(/Invalid public key format/);
    expect(() => decimalStringToHex("1.")).toThrow(/Invalid public key format/);
    expect(() => decimalStringToHex(".2")).toThrow(/Invalid public key format/);
  });
});
