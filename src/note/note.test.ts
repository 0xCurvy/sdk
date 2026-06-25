import { describe, expect, it } from "vitest";
import { Note } from "./note";
import type { FullNoteData, NoteOwner } from "./types";

// The unified Note: flat amount/token, owner (bjj pubkey + shared secret), the
// ephemeral PUBLIC key R as a [x, y] point, and a view tag. id/nullifier/
// ownerHash are derived; serialize* emit the aggregator backend wire shapes.

const ownerKey = { x: 1n, y: 2n };
const sharedSecret = 3n;
const owner: NoteOwner = { babyJubjubPublicKey: ownerKey, sharedSecret };
const ephemeralKey: [bigint, bigint] = [456n, 789n];
const viewTag = 0x315n;

const make = (over: Partial<{ amount: bigint; token: bigint }> = {}) =>
  new Note({ amount: 100n, token: 1n, owner, ephemeralKey, viewTag, ...over });

describe("Note.computeOwnerHash", () => {
  it("is deterministic for the same owner", () => {
    const a = Note.computeOwnerHash(owner);
    const b = Note.computeOwnerHash(owner);
    expect(a).toBe(b);
    expect(typeof a).toBe("bigint");
  });

  it("changes when the shared secret changes", () => {
    const a = Note.computeOwnerHash({ babyJubjubPublicKey: ownerKey, sharedSecret });
    const b = Note.computeOwnerHash({ babyJubjubPublicKey: ownerKey, sharedSecret: sharedSecret + 1n });
    expect(a).not.toBe(b);
  });
});

describe("Note getters", () => {
  it("ownerHash matches computeOwnerHash(owner)", () => {
    expect(make().ownerHash).toBe(Note.computeOwnerHash(owner));
  });

  it("nullifier depends only on owner, not amount/token", () => {
    // nullifier = poseidon(sharedSecret, x, y) — independent of amount/token.
    expect(make({ amount: 100n }).nullifier).toBe(make({ amount: 200n }).nullifier);
  });
});

describe("serialize shapes", () => {
  it("serializeInputNote exposes id, nullifier, owner and balance as strings", () => {
    const note = make();
    const input = note.serializeInputNote();

    expect(input.id).toBe(note.id.toString());
    expect(input.nullifier).toBe(note.nullifier.toString());
    expect(input.owner.babyJubjubPublicKey.x).toBe("1");
    expect(input.owner.babyJubjubPublicKey.y).toBe("2");
    expect(input.owner.babyJubjubPublicKey.serialized).toBe("1.2");
    expect(input.owner.sharedSecret).toBe("3");
    expect(input.balance).toEqual({ amount: "100", token: "1" });
  });

  it("serializeOutputNote exposes id, ownerHash, balance and delivery tag", () => {
    const note = make();
    const output = note.serializeOutputNote();

    expect(output.id).toBe(note.id.toString());
    expect(output.ownerHash).toBe(note.ownerHash.toString());
    expect(output.balance).toEqual({ amount: "100", token: "1" });
    // R emitted as the "x.y" decimal-point string; viewTag as hex (no 0x).
    expect(output.deliveryTag.ephemeralKey).toBe("456.789");
    expect(output.deliveryTag.viewTag).toBe("315");
  });

  it("serializeFullNote merges input and output shapes", () => {
    const note = make();
    const full: FullNoteData = note.serializeFullNote();

    expect(full.id).toBe(note.id.toString());
    expect(full.nullifier).toBe(note.nullifier.toString());
    expect(full.ownerHash).toBe(note.ownerHash.toString());
    expect(full.owner.sharedSecret).toBe("3");
    expect(full.deliveryTag.viewTag).toBe("315");
  });
});

describe("id / ownerHash invariants", () => {
  it("two notes with the same owner, amount and token share id and ownerHash", () => {
    expect(make().ownerHash).toBe(make().ownerHash);
    expect(make().id).toBe(make().id);
  });

  it("a different amount produces a different id but the same ownerHash", () => {
    const a = make({ amount: 100n });
    const b = make({ amount: 200n });
    expect(a.ownerHash).toBe(b.ownerHash);
    expect(a.id).not.toBe(b.id);
  });
});

describe("Note.random", () => {
  it("produces a serializable dummy note with the given amount/token", () => {
    const note = Note.random({ amount: 5n, token: 7n });
    expect(note.amount).toBe(5n);
    expect(note.token).toBe(7n);
    expect(note.owner.babyJubjubPublicKey).toEqual({ x: 0n, y: 0n });
    expect(() => note.serializeFullNote()).not.toThrow();
  });

  it("produces a distinct shared secret + ephemeral point on each call", () => {
    const a = Note.random({ amount: 0n, token: 0n });
    const b = Note.random({ amount: 0n, token: 0n });
    expect(a.owner.sharedSecret).not.toBe(b.owner.sharedSecret);
    expect(a.ephemeralKey).not.toEqual(b.ephemeralKey);
  });
});
