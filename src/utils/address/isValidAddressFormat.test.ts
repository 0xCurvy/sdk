import { describe, expect, it } from "vitest";
import { isValidAddressFormat } from "./isValidAddressFormat";

const EVM = `0x${"a".repeat(40)}`;
const EVM_CHECKSUM = "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf";
const SOLANA = "7AMVqK9evj3YaWbfdV2fzdckJW6Q7vMphkQKcEEVET4T";

describe("isValidAddressFormat", () => {
  it("validates EVM addresses when no flavour is given (default)", () => {
    expect(isValidAddressFormat(EVM)).toBe(true);
    expect(isValidAddressFormat(EVM_CHECKSUM)).toBe(true);
    expect(isValidAddressFormat(SOLANA)).toBe(false);
  });

  it("validates EVM addresses for the evm flavour", () => {
    expect(isValidAddressFormat(EVM, "evm")).toBe(true);
    expect(isValidAddressFormat(SOLANA, "evm")).toBe(false);
  });

  it("validates Solana base58 addresses for the solana flavour", () => {
    expect(isValidAddressFormat(SOLANA, "solana")).toBe(true);
    expect(isValidAddressFormat("11111111111111111111111111111111", "solana")).toBe(true);
  });

  it("rejects EVM hex addresses under the solana flavour", () => {
    expect(isValidAddressFormat(EVM, "solana")).toBe(false);
    expect(isValidAddressFormat(EVM_CHECKSUM, "solana")).toBe(false);
  });

  it("rejects garbage under both flavours", () => {
    expect(isValidAddressFormat("not-an-address", "evm")).toBe(false);
    expect(isValidAddressFormat("not-an-address!", "solana")).toBe(false);
  });
});
