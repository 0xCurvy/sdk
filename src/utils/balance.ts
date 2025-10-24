import dayjs from "dayjs";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import { BALANCE_TYPE, type HexString, Note, type NoteBalanceEntry } from "@/types";

function balanceEntryToNote({ balance, owner, deliveryTag, erc1155TokenId }: NoteBalanceEntry): Note {
  return new Note({
    balance: { amount: balance.toString(), token: erc1155TokenId.toString() },
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
    erc1155TokenId: token,
    balance: BigInt(amount),
    owner,
    deliveryTag,
    lastUpdated: +dayjs(), // TODO: @vanja remove
  };
}

export { noteToBalanceEntry, balanceEntryToNote };
