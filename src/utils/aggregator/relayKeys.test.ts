import { describe, expect, it } from "vitest";
import type { RelaySubmissionKeyMaterial } from "@/types/aggregator";
import { deriveRelayRequestKey, deriveRelaySpendKey, relaySubmissionNullifiers } from "./relayKeys";

const material = (overrides: Partial<RelaySubmissionKeyMaterial> = {}): RelaySubmissionKeyMaterial => ({
  action: "aggregation",
  networkId: 1,
  maxInputs: 2,
  proof: {
    a: ["1", "2"],
    b: [
      ["3", "4"],
      ["5", "6"],
    ],
    c: ["7", "8"],
  },
  publicSignals: ["11", "12", "21"],
  ...overrides,
});

describe("relay keys", () => {
  it("keeps exact request identity separate from stable spend identity", () => {
    const first = material();
    const reproved = material({ proof: { ...first.proof, c: ["7", "99"] } });
    const updatedRoot = material({ publicSignals: ["11", "12", "22"] });

    expect(deriveRelayRequestKey(reproved)).not.toBe(deriveRelayRequestKey(first));
    expect(deriveRelaySpendKey(reproved)).toBe(deriveRelaySpendKey(first));
    expect(deriveRelayRequestKey(updatedRoot)).not.toBe(deriveRelayRequestKey(first));
    expect(deriveRelaySpendKey(updatedRoot)).toBe(deriveRelaySpendKey(first));
  });

  it("keeps spend identity stable when the same inputs are reordered", () => {
    expect(deriveRelaySpendKey(material({ publicSignals: ["11", "12", "21"] }))).toBe(
      deriveRelaySpendKey(material({ publicSignals: ["12", "11", "21"] })),
    );
  });

  it("extracts withdrawal nullifiers after the withdrawn amount and ignores padding", () => {
    expect(relaySubmissionNullifiers("withdrawal", 3, ["100", "11", "0", "12", "99"])).toEqual([11n, 12n]);
  });

  it("rejects payloads without a real nullifier", () => {
    expect(() => deriveRelaySpendKey(material({ publicSignals: ["0", "0", "21"] }))).toThrow(
      /no non-padding nullifiers/,
    );
  });
});
