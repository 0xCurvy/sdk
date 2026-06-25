import { describe, expect, it, vi } from "vitest";
import { Note } from "@/note";
import type { CurvyId, CurvyPublicKeys } from "@/types";
import { generateNewNote } from "./generateNewNote";
import type { CommandContext } from "./types";

function buildCtx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    id: "cmd",
    input: [],
    network: {} as never,
    networkSlug: "localnet",
    senderCurvyId: "alice.curvy.name" as CurvyId,
    ownerBjjPrivateKeyHex: "0x00",
    config: {} as never,
    api: {
      user: { ResolveCurvyId: vi.fn() },
      aggregator: {},
    } as never,
    core: { sendNote: vi.fn() } as never,
    signMessage: vi.fn(),
    ...overrides,
  };
}

describe("generateNewNote", () => {
  it("resolves a Curvy handle and mints a note with the resolved keys", async () => {
    const note = Note.random({ amount: 100n, token: 1n });
    const sendNote = vi.fn(async () => note);
    const ResolveCurvyId = vi.fn(async () => ({
      data: {
        createdAt: "2024-01-01T00:00:00.000Z",
        publicKeys: { spendingKey: "0xS", viewingKey: "0xV", babyJubjubPublicKey: "1.2" },
      },
    }));
    const ctx = buildCtx({
      api: { user: { ResolveCurvyId }, aggregator: {} } as never,
      core: { sendNote } as never,
    });

    const result = await generateNewNote(ctx, "bob.curvy.name" as CurvyId, 1n, 100n);

    expect(result).toBe(note);
    expect(ResolveCurvyId).toHaveBeenCalledWith("bob.curvy.name");
    expect(sendNote).toHaveBeenCalledWith("0xS", "0xV", {
      ownerBabyJubjubPublicKey: "1.2",
      amount: 100n,
      token: 1n,
    });
  });

  it("uses explicit public keys directly without resolving a handle", async () => {
    const note = Note.random({ amount: 5n, token: 9n });
    const sendNote = vi.fn(async () => note);
    const ResolveCurvyId = vi.fn();
    const ctx = buildCtx({
      api: { user: { ResolveCurvyId }, aggregator: {} } as never,
      core: { sendNote } as never,
    });

    const keys: CurvyPublicKeys = { S: "0xKS", V: "0xKV", babyJubjubPublicKey: "3.4" };
    await generateNewNote(ctx, keys, 9n, 5n);

    expect(ResolveCurvyId).not.toHaveBeenCalled();
    expect(sendNote).toHaveBeenCalledWith("0xKS", "0xKV", {
      ownerBabyJubjubPublicKey: "3.4",
      amount: 5n,
      token: 9n,
    });
  });

  it("throws when the handle cannot be resolved", async () => {
    const ResolveCurvyId = vi.fn(async () => ({ data: null }));
    const ctx = buildCtx({ api: { user: { ResolveCurvyId }, aggregator: {} } as never });
    await expect(generateNewNote(ctx, "ghost.curvy.name" as CurvyId, 1n, 1n)).rejects.toThrow(
      "Handle ghost.curvy.name not found",
    );
  });

  it("throws when the resolved handle has no BabyJubjub key", async () => {
    const ResolveCurvyId = vi.fn(async () => ({
      data: {
        createdAt: "2024-01-01T00:00:00.000Z",
        publicKeys: { spendingKey: "0xS", viewingKey: "0xV", babyJubjubPublicKey: null },
      },
    }));
    const ctx = buildCtx({ api: { user: { ResolveCurvyId }, aggregator: {} } as never });
    await expect(generateNewNote(ctx, "alice.curvy.name" as CurvyId, 1n, 1n)).rejects.toThrow(
      "BabyJubjub public key not found for handle alice.curvy.name",
    );
  });
});
