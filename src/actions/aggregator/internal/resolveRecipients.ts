import type { CurvyConfig } from "@/config/types";
import { Note } from "@/note";
import { ephemeralPubKey, generateRandomBigInt } from "@/proving";
import type { AggregateRecipientInput } from "../types";

/**
 * Resolve aggregation recipients into the actual output {@link Note} objects the
 * witness commits to:
 *  - `{ curvyId }`     -> resolve the handle's keys, then `core.sendNote` (real ECDH
 *                         stealth delivery, so the recipient can DISCOVER the note);
 *  - `{ publicKeys }`  -> same delivery, skipping the handle lookup;
 *  - raw stealth tuple -> a self/test note with a random ephemeral key (undiscoverable).
 *
 * Mixed forms are allowed in one aggregation. The returned notes are passed to the
 * witness builder as `recipientNotes`, preserving each note's delivery fields.
 */
export async function resolveRecipients(
  config: CurvyConfig,
  recipients: AggregateRecipientInput[],
  token: bigint,
): Promise<Note[]> {
  return Promise.all(
    recipients.map(async (recipient) => {
      if ("curvyId" in recipient) {
        const { data } = await config.api.user.ResolveCurvyId(recipient.curvyId);
        if (!data) throw new Error(`aggregate: Curvy handle "${recipient.curvyId}" not found`);
        const { spendingKey, viewingKey, babyJubjubPublicKey } = data.publicKeys;
        if (!babyJubjubPublicKey) {
          throw new Error(`aggregate: handle "${recipient.curvyId}" has no BabyJubjub public key`);
        }
        return config.core.sendNote(spendingKey, viewingKey, {
          ownerBabyJubjubPublicKey: babyJubjubPublicKey,
          amount: recipient.amount,
          token,
        });
      }

      if ("publicKeys" in recipient) {
        const { S, V, babyJubjubPublicKey } = recipient.publicKeys;
        return config.core.sendNote(S, V, {
          ownerBabyJubjubPublicKey: babyJubjubPublicKey,
          amount: recipient.amount,
          token,
        });
      }

      // Raw stealth tuple: construct directly with a random ephemeral key.
      return new Note({
        amount: recipient.amount,
        token,
        owner: {
          babyJubjubPublicKey: { x: recipient.ownerPub[0], y: recipient.ownerPub[1] },
          sharedSecret: recipient.sharedSecret,
        },
        ephemeralKey: ephemeralPubKey(generateRandomBigInt()),
        viewTag: 0n,
      });
    }),
  );
}
