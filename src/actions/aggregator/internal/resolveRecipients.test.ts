import { describe, expect, it } from "vitest";
import { Note } from "@/note";
import { createFakeConfig } from "@/test/fixtures";
import { resolveRecipients } from "./resolveRecipients";

describe("resolveRecipients", () => {
  it("preserves a pre-built recipient note instead of randomizing it again", async () => {
    const config = createFakeConfig();
    const note = Note.random({ amount: 25n, token: 3n });

    await expect(resolveRecipients(config, [{ note }], 3n)).resolves.toEqual([note]);
  });

  it("rejects a pre-built note for a different token", async () => {
    const config = createFakeConfig();
    const note = Note.random({ amount: 25n, token: 4n });

    await expect(resolveRecipients(config, [{ note }], 3n)).rejects.toThrow(/does not match/);
  });
});
