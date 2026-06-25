import { describe, expect, it } from "vitest";
import type { AcrossQuoteParams } from "@/types/solana";
import { encodeAcrossQuoteParams } from "@/utils/encoding/encodeAcrossQuoteParams";

function makeParams(overrides: Partial<AcrossQuoteParams> = {}): AcrossQuoteParams {
  return {
    recipient: new Uint8Array(32).fill(1),
    outputToken: new Uint8Array(32).fill(2),
    outputAmount: new Uint8Array(32).fill(3),
    destinationChainId: 8453n,
    exclusiveRelayer: new Uint8Array(32).fill(4),
    quoteTimestamp: 1700000000,
    fillDeadline: 1700003600,
    exclusivityParameter: 0,
    message: new Uint8Array(0),
    ...overrides,
  };
}

const FIXED_PREFIX = 32 + 32 + 32 + 8 + 32 + 4 + 4 + 4; // 148

describe("encodeAcrossQuoteParams", () => {
  it("produces fixed prefix + borsh-vec message length", () => {
    expect(encodeAcrossQuoteParams(makeParams()).length).toBe(FIXED_PREFIX + 4 + 0);
    expect(encodeAcrossQuoteParams(makeParams({ message: new Uint8Array(7) })).length).toBe(FIXED_PREFIX + 4 + 7);
  });

  it("lays out the fixed-size fields in declared order", () => {
    const out = encodeAcrossQuoteParams(makeParams());
    expect([...out.slice(0, 32)]).toEqual(new Array(32).fill(1)); // recipient
    expect([...out.slice(32, 64)]).toEqual(new Array(32).fill(2)); // outputToken
    expect([...out.slice(64, 96)]).toEqual(new Array(32).fill(3)); // outputAmount
  });

  it("encodes destinationChainId as u64 LE right after outputAmount", () => {
    const out = encodeAcrossQuoteParams(makeParams({ destinationChainId: 1n }));
    expect([...out.slice(96, 104)]).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("encodes the timestamp/deadline/exclusivity as u32 LE after exclusiveRelayer", () => {
    const out = encodeAcrossQuoteParams(makeParams({ quoteTimestamp: 1, fillDeadline: 256, exclusivityParameter: 0 }));
    expect([...out.slice(136, 140)]).toEqual([1, 0, 0, 0]); // quoteTimestamp
    expect([...out.slice(140, 144)]).toEqual([0, 1, 0, 0]); // fillDeadline
    expect([...out.slice(144, 148)]).toEqual([0, 0, 0, 0]); // exclusivityParameter
  });

  it("appends the message as a borsh vec (u32 LE length + body)", () => {
    const message = new Uint8Array([0xde, 0xad]);
    const out = encodeAcrossQuoteParams(makeParams({ message }));
    expect([...out.slice(FIXED_PREFIX, FIXED_PREFIX + 4)]).toEqual([2, 0, 0, 0]);
    expect([...out.slice(FIXED_PREFIX + 4)]).toEqual([0xde, 0xad]);
  });

  it("is deterministic", () => {
    expect([...encodeAcrossQuoteParams(makeParams())]).toEqual([...encodeAcrossQuoteParams(makeParams())]);
  });
});
