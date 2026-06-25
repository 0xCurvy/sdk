import dayjs from "dayjs";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { BalanceEntry, HexString } from "@/types";
import type { Note } from "./note";

/**
 * Convert a fully-initialized {@link Note} into a {@link BalanceEntry}, merging
 * in the chain/currency metadata that lives outside the note itself.
 *
 * @example
 * const entry = noteToBalanceEntry(note, {
 *   symbol: "USDC",
 *   decimals: 6,
 *   accountId,
 *   environment,
 *   networkSlug,
 *   currencyAddress,
 * });
 *
 * @throws if the note is missing balance, owner or delivery tag.
 */
export function noteToBalanceEntry(
  note: Note,
  balanceEntryData: {
    symbol: string;
    decimals: number;
    accountId: string;
    environment: NETWORK_ENVIRONMENT_VALUES;
    networkSlug: string;
    currencyAddress: HexString;
  },
): BalanceEntry {
  const { token, amount, ownerHash, id } = note;

  const { owner, deliveryTag } = note.serializeFullNote();

  return {
    ...balanceEntryData,
    id: id.toString(),
    source: `0x${ownerHash.toString(16)}`,
    vaultTokenId: token,
    balance: amount,
    owner,
    deliveryTag,
    lastUpdated: +dayjs(), // TODO: @vanja remove
  };
}
