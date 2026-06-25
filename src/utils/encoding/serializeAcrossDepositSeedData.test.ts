import { describe, expect, it } from "vitest";
import { serializeAcrossDepositSeedData } from "@/utils/encoding/serializeAcrossDepositSeedData";

type Args = Parameters<typeof serializeAcrossDepositSeedData>[0];

function makeArgs(overrides: Partial<Args> = {}): Args {
  return {
    depositor: new Uint8Array(32).fill(1),
    recipient: new Uint8Array(32).fill(2),
    inputToken: new Uint8Array(32).fill(3),
    outputToken: new Uint8Array(32).fill(4),
    inputAmount: 1_000_000n,
    outputAmount: new Uint8Array(32).fill(5),
    destinationChainId: 8453n,
    exclusiveRelayer: new Uint8Array(32).fill(6),
    quoteTimestamp: 1700000000,
    fillDeadline: 1700003600,
    exclusivityParameter: 0,
    message: new Uint8Array(0),
    ...overrides,
  };
}

describe("serializeAcrossDepositSeedData", () => {
  it("produces 224 fixed bytes plus the message length", () => {
    expect(serializeAcrossDepositSeedData(makeArgs()).length).toBe(224);
    expect(serializeAcrossDepositSeedData(makeArgs({ message: new Uint8Array(11) })).length).toBe(235);
  });

  it("lays out the 32-byte address fields in declared order", () => {
    const out = serializeAcrossDepositSeedData(makeArgs());
    expect([...out.slice(0, 32)]).toEqual(new Array(32).fill(1)); // depositor
    expect([...out.slice(32, 64)]).toEqual(new Array(32).fill(2)); // recipient
    expect([...out.slice(64, 96)]).toEqual(new Array(32).fill(3)); // inputToken
    expect([...out.slice(96, 128)]).toEqual(new Array(32).fill(4)); // outputToken
  });

  it("encodes inputAmount as u64 LE at offset 128", () => {
    const out = serializeAcrossDepositSeedData(makeArgs({ inputAmount: 1n }));
    expect([...out.slice(128, 136)]).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("places outputAmount then destinationChainId (u64 LE) then exclusiveRelayer", () => {
    const out = serializeAcrossDepositSeedData(makeArgs({ destinationChainId: 256n }));
    expect([...out.slice(136, 168)]).toEqual(new Array(32).fill(5)); // outputAmount
    expect([...out.slice(168, 176)]).toEqual([0, 1, 0, 0, 0, 0, 0, 0]); // destinationChainId LE
    expect([...out.slice(176, 208)]).toEqual(new Array(32).fill(6)); // exclusiveRelayer
  });

  it("encodes the three u32 LE fields then the message length prefix", () => {
    const out = serializeAcrossDepositSeedData(
      makeArgs({ quoteTimestamp: 1, fillDeadline: 256, exclusivityParameter: 0, message: new Uint8Array([9, 9]) }),
    );
    const dv = new DataView(out.buffer, out.byteOffset);
    expect(dv.getUint32(208, true)).toBe(1); // quoteTimestamp
    expect(dv.getUint32(212, true)).toBe(256); // fillDeadline
    expect(dv.getUint32(216, true)).toBe(0); // exclusivityParameter
    expect(dv.getUint32(220, true)).toBe(2); // message length prefix
    expect([...out.slice(224)]).toEqual([9, 9]); // message body
  });

  it("is deterministic", () => {
    expect([...serializeAcrossDepositSeedData(makeArgs())]).toEqual([...serializeAcrossDepositSeedData(makeArgs())]);
  });
});
