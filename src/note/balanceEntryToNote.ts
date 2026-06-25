import type { BalanceEntry } from "@/types";
import { invariant } from "@/utils/invariant";
import { Note } from "./note";

/**
 * Convert a {@link BalanceEntry} into a {@link Note}, mapping its balance,
 * owner and delivery tag. Requires `vaultTokenId` to derive the note token.
 *
 * @example
 * const note = balanceEntryToNote(balanceEntry);
 *
 * @throws if the entry has no `vaultTokenId`.
 */
export function balanceEntryToNote({ balance, owner, deliveryTag, vaultTokenId }: BalanceEntry): Note {
  invariant(vaultTokenId, "vaultTokenId is required to convert NoteBalanceEntry to Note");

  // The entry stores R as the "x.y" decimal-point string and the view tag as a
  // (possibly 0x-prefixed) hex string; parse them into the note's bigint domain.
  const [rX, rY] = deliveryTag.ephemeralKey.split(".");
  const viewTag = deliveryTag.viewTag.startsWith("0x") ? deliveryTag.viewTag : `0x${deliveryTag.viewTag}`;

  return new Note({
    amount: balance,
    token: vaultTokenId,
    owner: {
      babyJubjubPublicKey: { x: BigInt(owner.babyJubjubPublicKey.x), y: BigInt(owner.babyJubjubPublicKey.y) },
      sharedSecret: BigInt(owner.sharedSecret),
    },
    ephemeralKey: [BigInt(rX), BigInt(rY)],
    viewTag: BigInt(viewTag),
  });
}
