import dayjs from "dayjs";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { StringifyBigInts } from "@/types/helper";
import { NoteBalanceEntry } from "@/types/storage";
import { poseidonHash } from "@/utils/poseidon-hash";
import { BALANCE_TYPE, type NoteBalanceEntry } from "./storage";

type Balance = {
  amount: bigint;
  token: bigint;
};

type BabyJubjubPublicKey = {
  x: bigint;
  y: bigint;
};

type Owner = {
  babyJubjubPublicKey: BabyJubjubPublicKey;
  sharedSecret: bigint;
};

type DeliveryTag = {
  ephemeralKey: bigint;
  viewTag: bigint;
};

type PublicNote = {
  ownerHash: bigint;
} & DeliveryTag;

type AuthenticatedNote = {
  ownerHash: bigint;
} & Balance &
  DeliveryTag;

type DepositNote = {
  ownerHash: bigint;
} & Balance &
  DeliveryTag;

type AggregationInputNote = {
  owner: Owner;
} & Balance;

type AggregationOutputNote = {
  ownerHash: bigint;
} & Balance &
  DeliveryTag;

type WithdrawalNote = {
  owner: Owner;
} & Balance;

type CircuitInputNote = {
  owner: Owner;
} & Balance;

type CircuitOutputNote = {
  ownerHash: bigint;
} & Balance;

type FullNoteData = {
  owner: Owner;
  ownerHash: bigint;
  balance: Balance;
  deliveryTag: DeliveryTag;
};

class Note {
  ownerHash: bigint;
  sharedSecret?: bigint;
  balance?: Balance;
  owner?: Owner;
  deliveryTag?: DeliveryTag;

  constructor(data: Partial<FullNoteData>) {
    if (data.ownerHash) {
      this.ownerHash = data.ownerHash;
    } else {
      if (data.owner) {
        this.ownerHash = Note.generateOwnerHash(data.owner);
      } else {
        throw new Error("Owner is not set");
      }
    }

    this.balance = data.balance;
    this.owner = data.owner;
    this.deliveryTag = data.deliveryTag;
  }

  get id(): bigint {
    if (!this.balance) {
      throw new Error("Missing balance");
    }

    return poseidonHash([this.ownerHash, this.balance.amount, this.balance.token]);
  }

  get nullifier(): bigint {
    if (!this.owner) {
      throw new Error("Missing owner");
    }

    return poseidonHash([this.owner.babyJubjubPublicKey.x, this.owner.babyJubjubPublicKey.y, this.owner.sharedSecret]);
  }

  static generateOwnerHash(owner: Owner): bigint {
    return poseidonHash([owner.babyJubjubPublicKey.x, owner.babyJubjubPublicKey.y, owner.sharedSecret]);
  }

  // Deposit note
  // =========================================================

  // Used when sending deposit request to aggregator backend
  serializeDepositNote(): DepositNote {
    return this.serializeAuthenticatedNote();
  }

  // Used when receiving deposit note from aggregator backend
  static deserializeDepositNote(depositNote: StringifyBigInts<DepositNote>): Note {
    return Note.deserializeAuthenticatedNote(depositNote);
  }

  // Aggregation notes
  // =========================================================

  // Used when sending aggregation request to aggregator backend
  serializeAggregationInputNote(): AggregationInputNote {
    if (!this.owner) {
      throw new Error("Owner is not set");
    }

    if (!this.balance) {
      throw new Error("Balance is not set");
    }

    return {
      owner: this.owner,
      ...this.balance,
    };
  }

  // Used when receiving aggregation input note from aggregator backend
  static deserializeAggregationInputNote(aggregationInputNote: AggregationInputNote): Note {
    const note = new Note({
      ownerHash: Note.generateOwnerHash(aggregationInputNote.owner),
      balance: aggregationInputNote,
    });
    return note;
  }

  // Used when sending aggregation request to aggregator backend
  serializeAggregationOutputNote(): AggregationOutputNote {
    if (!this.ownerHash) {
      throw new Error("Owner hash is not set");
    }

    if (!this.balance) {
      throw new Error("Balance is not set");
    }

    if (!this.deliveryTag) {
      throw new Error("Delivery tag is not set");
    }

    return {
      ownerHash: this.ownerHash,
      ...this.balance,
      ...this.deliveryTag,
    };
  }

  // Used when receiving aggregation output note from aggregator backend
  static deserializeAggregationOutputNote(aggregationOutputNote: AggregationOutputNote): Note {
    const note = new Note({
      ownerHash: aggregationOutputNote.ownerHash,
      balance: {
        token: aggregationOutputNote.token,
        amount: aggregationOutputNote.amount,
      },
      deliveryTag: {
        ephemeralKey: aggregationOutputNote.ephemeralKey,
        viewTag: aggregationOutputNote.viewTag,
      },
    });
    return note;
  }

  // Withdrawal note
  // =========================================================

  // Used when sending withdrawal request to aggregator backend
  serializeWithdrawalNote(): WithdrawalNote {
    return this.serializeAggregationInputNote();
  }

  // Used when receiving withdrawal note from aggregator backend
  static deserializeWithdrawalNote(withdrawalNote: WithdrawalNote): Note {
    return Note.deserializeAggregationInputNote(withdrawalNote);
  }

  // Circuit notes
  // =========================================================

  // Used when providing inputs for the ZK prover circuit
  serializeCircuitInputNote(): CircuitInputNote {
    if (!this.owner) {
      throw new Error("Owner is not set");
    }

    if (!this.balance) {
      throw new Error("Balance is not set");
    }

    return {
      owner: {
        babyJubjubPublicKey: this.owner.babyJubjubPublicKey,
        sharedSecret: this.owner.sharedSecret,
      },
      ...this.balance,
    };
  }

  // Used when providing inputs for the ZK prover circuit
  serializeCircuitOutputNote(): CircuitOutputNote {
    if (!this.ownerHash) {
      throw new Error("Owner hash is not set");
    }

    if (!this.balance) {
      throw new Error("Balance is not set");
    }

    return {
      ownerHash: this.ownerHash,
      ...this.balance,
    };
  }

  // Authenticated note
  // =========================================================

  // Used when returning note with balances after verification of clientside proof of ownership
  serializeAuthenticatedNote(): AuthenticatedNote {
    if (!this.ownerHash) {
      throw new Error("Owner hash is not set");
    }

    if (!this.balance) {
      throw new Error("Balance is not set");
    }

    if (!this.deliveryTag) {
      throw new Error("Delivery tag is not set");
    }

    return {
      ownerHash: this.ownerHash,
      ...this.balance,
      ...this.deliveryTag,
    };
  }

  // Used when receiving note with balances after verification of clientside proof of ownership
  static deserializeAuthenticatedNote(authenticatedNote: StringifyBigInts<AuthenticatedNote>): Note {
    const note = new Note({
      ownerHash: BigInt(authenticatedNote.ownerHash),
      balance: {
        token: BigInt(authenticatedNote.token),
        amount: BigInt(authenticatedNote.amount),
      },
      deliveryTag: {
        ephemeralKey: BigInt(authenticatedNote.ephemeralKey),
        viewTag: BigInt(authenticatedNote.viewTag),
      },
    });
    return note;
  }

  // Public note
  // =========================================================

  // Used when receiving notes from the trees repository to scan notes for ownership
  serializePublicNote(): PublicNote {
    if (!this.ownerHash) {
      throw new Error("Owner hash is not set");
    }

    if (!this.deliveryTag) {
      throw new Error("Delivery tag is not set");
    }

    return {
      ownerHash: this.ownerHash,
      ...this.deliveryTag,
    };
  }

  serializeFullNote(): FullNoteData {
    if (!this.owner || !this.ownerHash || !this.balance || !this.deliveryTag) {
      throw new Error("Note is not fully initialized");
    }

    return {
      owner: this.owner,
      ownerHash: this.ownerHash,
      balance: this.balance,
      deliveryTag: this.deliveryTag,
    };
  }

  // Used when receiving notes from the trees repository to scan notes for ownership
  static deserializePublicNote(publicNote: PublicNote): Note {
    const note = new Note({
      ownerHash: publicNote.ownerHash,
      deliveryTag: {
        ephemeralKey: publicNote.ephemeralKey,
        viewTag: publicNote.viewTag,
      },
    });
    return note;
  }

  static fromNoteBalanceEntry({ balance, owner, deliveryTag, currencyAddress, source }: NoteBalanceEntry): Note {
    return new Note({
      balance: { amount: balance, token: BigInt(currencyAddress) },
      owner,
      deliveryTag,
      ownerHash: BigInt(source),
    });
  }
  serializeNoteToBalanceEntry(
    symbol: string,
    walletId: string,
    environment: NETWORK_ENVIRONMENT_VALUES,
    networkSlug: string,
  ): NoteBalanceEntry {
    if (!this.balance || !this.owner || !this.deliveryTag) {
      throw new Error("Note is not fully initialized");
    }
    const {
      balance: { token, amount },
      ownerHash,
      owner,
      deliveryTag,
    } = this;

    return {
      walletId,
      source: ownerHash.toString(16),
      type: BALANCE_TYPE.NOTE,
      networkSlug,
      environment,
      currencyAddress: token.toString(16),
      symbol,
      balance: BigInt(amount),
      owner,
      deliveryTag,
      lastUpdated: +dayjs(), // TODO: @vanja remove
    };
  }
}

export { Note, FullNoteData };
