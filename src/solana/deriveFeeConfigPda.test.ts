import type { Address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { deriveConfigPda } from "./deriveConfigPda";
import { deriveFeeConfigPda } from "./deriveFeeConfigPda";

const PROGRAM = "6cHtg7sPLL9NQQuuyepnkud6PskMWV5yxvU2vXfag4qX" as Address;

describe("deriveFeeConfigPda", () => {
  it("is deterministic and distinct from the config PDA", async () => {
    const [a] = await deriveFeeConfigPda(PROGRAM);
    const [b] = await deriveFeeConfigPda(PROGRAM);
    const [config] = await deriveConfigPda(PROGRAM);
    expect(a).toBe(b);
    expect(a).not.toBe(config);
  });
});
