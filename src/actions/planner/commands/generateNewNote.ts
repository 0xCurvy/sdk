import { CommandError } from "@/errors";
import type { Note } from "@/note";
import { type CurvyId, type CurvyPublicKeys, isValidCurvyId } from "@/types";
import type { CommandContext } from "./types";

/**
 * Resolve a Curvy handle or explicit public keys and seal a discoverable note
 * for that recipient.
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
      throw new CommandError(`Curvy handle "${handleOrKeys}" was not found.`, "aggregator-aggregate");
    }

    if (!recipientDetails.publicKeys.babyJubjubPublicKey) {
      throw new CommandError(`Curvy handle "${handleOrKeys}" cannot receive shielded notes.`, "aggregator-aggregate");
    }

    ({ spendingKey: S, viewingKey: V, babyJubjubPublicKey } = recipientDetails.publicKeys);
  } else {
    if (typeof handleOrKeys !== "object") {
      throw new CommandError("Provide a valid Curvy handle or recipient public keys.", "aggregator-aggregate");
    }

    ({ S, V, babyJubjubPublicKey } = handleOrKeys);
  }

  return ctx.core.sendNote(S, V, {
    ownerBabyJubjubPublicKey: babyJubjubPublicKey,
    amount,
    token,
  });
}
