import { describe, expect, it } from "vitest";
import { Core } from "@/core";

// Real-WASM Core coverage. Unlike the action/planner tests (which use the fake
// `ICore` from @/test/fixtures), these tests instantiate the genuine Go WASM
// module and load the note-ownership zkey from packages/sdk/assets. They run fully
// offline but are noticeably slower than the unit suite, hence the per-test
// timeouts.

const AMOUNT = 10n ** 18n;
const TOKEN = 1n;

describe("Core.generateKeyPairs (real WASM)", () => {
  it("returns keys with the expected lengths", async () => {
    const core = new Core();
    const keyPairs = await core.generateKeyPairs();

    expect(keyPairs.s.length).toBe(64);
    expect(keyPairs.S.length).toBeGreaterThanOrEqual(152);
    expect(keyPairs.S.length).toBeLessThanOrEqual(157);

    expect(keyPairs.v.length).toBeOneOf([64, 62]);
    expect(keyPairs.V.length).toBeGreaterThanOrEqual(152);
    expect(keyPairs.V.length).toBeLessThanOrEqual(157);

    // babyJubjubPublicKey is an "X.Y" decimal-key string.
    expect(keyPairs.babyJubjubPublicKey.split(".")).toHaveLength(2);
  }, 60_000);

  it("getCurvyKeys is a deterministic round-trip from (s, v)", async () => {
    const core = new Core();
    const keyPairs = await core.generateKeyPairs();

    const derived = await core.getCurvyKeys(keyPairs.s, keyPairs.v);

    expect(derived.s).toBe(keyPairs.s);
    expect(derived.v).toBe(keyPairs.v);
    expect(derived.S).toBe(keyPairs.S);
    expect(derived.V).toBe(keyPairs.V);
    expect(derived.babyJubjubPublicKey).toBe(keyPairs.babyJubjubPublicKey);
  }, 60_000);
});

describe("Core.sendNote (real WASM)", () => {
  it("builds a note whose owner public key matches the recipient", async () => {
    const core = new Core();
    const recipient = await core.generateKeyPairs();

    const note = await core.sendNote(recipient.S, recipient.V, {
      ownerBabyJubjubPublicKey: recipient.babyJubjubPublicKey,
      amount: AMOUNT,
      token: TOKEN,
    });

    const [x, y] = recipient.babyJubjubPublicKey.split(".");
    expect(note.owner.babyJubjubPublicKey.x).toBe(BigInt(x));
    expect(note.owner.babyJubjubPublicKey.y).toBe(BigInt(y));
    expect(note.amount).toBe(AMOUNT);
    expect(note.token).toBe(TOKEN);
  }, 60_000);
});
