import { describe, expect, it } from "vitest";
import { isValidEvmAddress } from "./isValidEvmAddress";

describe("isValidEvmAddress", () => {
  it("accepts a canonical lowercase 40-hex address", () => {
    expect(isValidEvmAddress(`0x${"a".repeat(40)}`)).toBe(true);
  });

  it("accepts mixed-case (checksummed) hex", () => {
    expect(isValidEvmAddress("0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf")).toBe(true);
  });

  it("rejects an address without the 0x prefix", () => {
    expect(isValidEvmAddress("a".repeat(40))).toBe(false);
  });

  it("rejects an address that is too short", () => {
    expect(isValidEvmAddress(`0x${"a".repeat(39)}`)).toBe(false);
  });

  it("rejects an address that is too long", () => {
    expect(isValidEvmAddress(`0x${"a".repeat(41)}`)).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(isValidEvmAddress(`0x${"z".repeat(40)}`)).toBe(false);
  });

  it("rejects a Solana base58 address", () => {
    expect(isValidEvmAddress("7AMVqK9evj3YaWbfdV2fzdckJW6Q7vMphkQKcEEVET4T")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidEvmAddress("")).toBe(false);
  });
});
