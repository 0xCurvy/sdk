import type { Note } from "@/note";
import { type CurvyId, type CurvyPublicKeys, isValidCurvyId } from "@/types";
import type { CommandContext } from "./types";

/**
 * Resolve a recipient (Curvy handle or explicit public keys) into a freshly
 * minted {@link Note} for `token`/`amount`. Faithful functional port of
 * `CurvyCommand.generateNewNote`: handles get resolved via the api, explicit
 * keys are used directly, then the note is sealed by `core.sendNote`.
 *
 * @example
 * const note = await generateNewNote(ctx, "alice.curvy.name", 1n, 1000n);
 *
 * @throws if the handle cannot be resolved, has no BabyJubjub key, or the
 * provided keys are invalid.
 */
export async function generateNewNote(
  ctx: CommandContext,
  handleOrKeys: CurvyId | CurvyPublicKeys,
  token: bigint,
  amount: bigint,
): Promise<Note> {
  let S: string;
  let V: string;
  let babyJubjubPublicKey: string;

  if (isValidCurvyId(handleOrKeys)) {
    const { data: recipientDetails } = await ctx.api.user.ResolveCurvyId(handleOrKeys);

    if (!recipientDetails) {
      throw new Error(`Handle ${handleOrKeys} not found`);
    }

    if (!recipientDetails.publicKeys.babyJubjubPublicKey) {
      throw new Error(`BabyJubjub public key not found for handle ${handleOrKeys}`);
    }

    ({ spendingKey: S, viewingKey: V, babyJubjubPublicKey } = recipientDetails.publicKeys);
  } else {
    if (typeof handleOrKeys !== "object") {
      throw new Error(`Invalid handle or keys provided`);
    }

    ({ S, V, babyJubjubPublicKey } = handleOrKeys);
  }

  return ctx.core.sendNote(S, V, {
    ownerBabyJubjubPublicKey: babyJubjubPublicKey,
    amount,
    token,
  });
}
