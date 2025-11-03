import dayjs from "dayjs";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import { BALANCE_TYPE, type HexString, Note, type NoteBalanceEntry } from "@/types";

function balanceEntryToNote({ balance, owner, deliveryTag, vaultTokenId }: NoteBalanceEntry): Note {
  return new Note({
    balance: { amount: balance.toString(), token: vaultTokenId.toString() },
    owner: {
      babyJubjubPublicKey: {
        x: owner.babyJubjubPublicKey.x,
        y: owner.babyJubjubPublicKey.y,
      },
      sharedSecret: owner.sharedSecret,
    },
    deliveryTag: {
      ephemeralKey: deliveryTag.ephemeralKey,
      viewTag: deliveryTag.viewTag,
    },
  });
}

function noteToBalanceEntry(
  note: Note,
  balanceEntryData: {
    symbol: string;
    decimals: number;
    walletId: string;
    environment: NETWORK_ENVIRONMENT_VALUES;
    networkSlug: string;
    currencyAddress: HexString;
    networkId: number; // TODO: @vanja vidi jel treba ovo ili mozemo da se oslonimo sa mo na network slug
  },
): NoteBalanceEntry {
  if (!note.balance || !note.owner || !note.deliveryTag) {
    throw new Error("Note is not fully initialized");
  }
  const {
    balance: { token, amount },
    ownerHash,
    id,
  } = note;

  const { owner, deliveryTag } = note.serializeFullNote();

  return {
    ...balanceEntryData,
    id: id.toString(),
    source: `0x${ownerHash.toString(16)}`,
    type: BALANCE_TYPE.NOTE,
    vaultTokenId: token,
    balance: BigInt(amount),
    owner,
    deliveryTag,
    lastUpdated: +dayjs(), // TODO: @vanja remove
  };
}

export { noteToBalanceEntry, balanceEntryToNote };
