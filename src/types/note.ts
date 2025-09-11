import dayjs from "dayjs";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { StringifyBigInts } from "@/types/helper";
import type { NoteBalanceEntry } from "@/types/storage";
import { poseidonHash } from "@/utils/poseidon-hash";
import { BALANCE_TYPE } from "./storage";

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
  ownerHash: string;
  deliveryTag: {
    ephemeralKey: string;
    viewTag: string;
  }
};

type AuthenticatedNote = {
  ownerHash: string;
  balance: {
    amount: string;
    token: string;
  }
  deliveryTag: {
    ephemeralKey: string;
    viewTag: string;
  }
};

type DepositNote = {
  ownerHash: string;
  balance: {
    amount: string;
    token: string;
  }
  deliveryTag: {
    ephemeralKey: string;
    viewTag: string;
  }
};

type AggregationInputNote = {
  owner: {
    babyJubjubPublicKey: {
      x: string;
      y: string;
    }
    sharedSecret: string;
  }
  balance: {
    amount: string;
    token: string;
  }
};

type AggregationOutputNote = {
  ownerHash: string;
  balance: {
    amount: string;
    token: string;
  }
  deliveryTag: {
    ephemeralKey: string;
    viewTag: string;
  }
};

type WithdrawalNote = {
  owner: {
    babyJubjubPublicKey: {
      x: string;
      y: string;
    }
    sharedSecret: string;
  }
  balance: {
    amount: string;
    token: string;
  }
};

type CircuitInputNote = {
  owner: {
    babyJubjubPublicKey: {
      x: string;
      y: string;
    }
    sharedSecret: string;
  }
  balance: {
    amount: string;
    token: string;
  }
};

type CircuitOutputNote = {
  ownerHash: string;
  balance: {
    amount: string;
    token: string;
  }
};

type FullNoteData = {
  owner: {
    babyJubjubPublicKey: {
      x: string;
      y: string;
    }
    sharedSecret: string;
  }
  ownerHash: string;
  balance: {
    amount: string;
    token: string;
  }
  deliveryTag: {
    ephemeralKey: string;
    viewTag: string;
  }
};

class Note {
  ownerHash: bigint;
  balance?: Balance;
  owner?: Owner;
  deliveryTag?: DeliveryTag;

  constructor(data: Partial<FullNoteData>) {
    if (data.ownerHash) {
      this.ownerHash = BigInt(data.ownerHash);
    } else {
      if (data.owner) {
        this.ownerHash = Note.generateOwnerHash({
          babyJubjubPublicKey: {
            x: BigInt(data.owner.babyJubjubPublicKey.x),
            y: BigInt(data.owner.babyJubjubPublicKey.y),
          },
          sharedSecret: BigInt(data.owner.sharedSecret),
        });
      } else {
        throw new Error("Owner is not set");
      }
    }

    this.balance = {
      amount: BigInt(data.balance!.amount),
      token: BigInt(data.balance!.token),
    };
    this.owner = {
      babyJubjubPublicKey: {
        x: BigInt(data.owner!.babyJubjubPublicKey.x),
        y: BigInt(data.owner!.babyJubjubPublicKey.y),
      },
      sharedSecret: BigInt(data.owner!.sharedSecret),
    };
    this.deliveryTag = {
      ephemeralKey: BigInt(data.deliveryTag!.ephemeralKey),
      viewTag: BigInt(data.deliveryTag!.viewTag),
    };
  }

  get id(): bigint {
    if (!this.balance) {
      throw new Error("Missing balance");
    }

    console.log(this);

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
      owner: {
        babyJubjubPublicKey: {
          x: this.owner.babyJubjubPublicKey.x.toString(),
          y: this.owner.babyJubjubPublicKey.y.toString(),
        },
        sharedSecret: this.owner.sharedSecret.toString(),
      },
      balance: {
        amount: this.balance.amount.toString(),
        token: this.balance.token.toString(),
      },
    };
  }

  // Used when receiving aggregation input note from aggregator backend
  static deserializeAggregationInputNote(aggregationInputNote: AggregationInputNote): Note {
    const note = new Note({
      ownerHash: Note.generateOwnerHash({
        babyJubjubPublicKey: {
          x: BigInt(aggregationInputNote.owner.babyJubjubPublicKey.x),
          y: BigInt(aggregationInputNote.owner.babyJubjubPublicKey.y),
        },
        sharedSecret: BigInt(aggregationInputNote.owner.sharedSecret),
      }).toString(),
      balance: {
        amount: aggregationInputNote.balance.amount,
        token: aggregationInputNote.balance.token,
      },
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
      ownerHash: this.ownerHash.toString(),
      balance: {
        amount: this.balance.amount.toString(),
        token: this.balance.token.toString(),
      },
      deliveryTag: {
        ephemeralKey: this.deliveryTag.ephemeralKey.toString(),
        viewTag: this.deliveryTag.viewTag.toString(),
      },
    };
  }

  // Used when receiving aggregation output note from aggregator backend
  static deserializeAggregationOutputNote(aggregationOutputNote: AggregationOutputNote): Note {
    const note = new Note({
      ownerHash: aggregationOutputNote.ownerHash,
      balance: {
        token: aggregationOutputNote.balance.token,
        amount: aggregationOutputNote.balance.amount,
      },
      deliveryTag: {
        ephemeralKey: aggregationOutputNote.deliveryTag.ephemeralKey,
        viewTag: aggregationOutputNote.deliveryTag.viewTag,
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
        babyJubjubPublicKey: {
          x: this.owner.babyJubjubPublicKey.x.toString(),
          y: this.owner.babyJubjubPublicKey.y.toString(),
        },
        sharedSecret: this.owner.sharedSecret.toString(),
      },
      balance: {
        amount: this.balance.amount.toString(),
        token: this.balance.token.toString(),
      },
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
      ownerHash: this.ownerHash.toString(),
      balance: {
        amount: this.balance.amount.toString(),
        token: this.balance.token.toString(),
      },
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
      ownerHash: this.ownerHash.toString(),
      balance: {
        amount: this.balance.amount.toString(),
        token: this.balance.token.toString(),
      },
      deliveryTag: {
        ephemeralKey: this.deliveryTag.ephemeralKey.toString(),
        viewTag: this.deliveryTag.viewTag.toString(),
      },
    };
  }

  // Used when receiving note with balances after verification of clientside proof of ownership
  static deserializeAuthenticatedNote(authenticatedNote: StringifyBigInts<AuthenticatedNote>): Note {
    const note = new Note({
      ownerHash: authenticatedNote.ownerHash,
      balance: {
        token: authenticatedNote.balance.token,
        amount: authenticatedNote.balance.amount,
      },
      deliveryTag: {
        ephemeralKey: authenticatedNote.deliveryTag.ephemeralKey,
        viewTag: authenticatedNote.deliveryTag.viewTag,
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
      ownerHash: this.ownerHash.toString(),
      deliveryTag: {
        ephemeralKey: this.deliveryTag.ephemeralKey.toString(),
        viewTag: this.deliveryTag.viewTag.toString(),
      },
    };
  }

  serializeFullNote(): FullNoteData {
    if (!this.owner || !this.ownerHash || !this.balance || !this.deliveryTag) {
      throw new Error("Note is not fully initialized");
    }

    return {
      owner: {
        babyJubjubPublicKey: {
          x: this.owner.babyJubjubPublicKey.x.toString(),
          y: this.owner.babyJubjubPublicKey.y.toString(),
        },
        sharedSecret: this.owner.sharedSecret.toString(),
      },
      ownerHash: this.ownerHash.toString(),
      balance: {
        amount: this.balance.amount.toString(),
        token: this.balance.token.toString(),
      },
      deliveryTag: {
        ephemeralKey: this.deliveryTag.ephemeralKey.toString(),
        viewTag: this.deliveryTag.viewTag.toString(),
      },
    };
  }

  // Used when receiving notes from the trees repository to scan notes for ownership
  static deserializePublicNote(publicNote: PublicNote): Note {
    const note = new Note({
      ownerHash: publicNote.ownerHash,
      deliveryTag: {
        ephemeralKey: publicNote.deliveryTag.ephemeralKey,
        viewTag: publicNote.deliveryTag.viewTag,
      },
    });
    return note;
  }

  static fromNoteBalanceEntry({ balance, owner, deliveryTag, currencyAddress, source }: NoteBalanceEntry): Note {
    return new Note({
      balance: { amount: balance.toString(), token: currencyAddress.toString() },
      owner: {
        babyJubjubPublicKey: {
          x: owner.babyJubjubPublicKey.x.toString(),
          y: owner.babyJubjubPublicKey.y.toString(),
        },
        sharedSecret: owner.sharedSecret.toString(),
      },
      deliveryTag: {
        ephemeralKey: deliveryTag.ephemeralKey.toString(),
        viewTag: deliveryTag.viewTag.toString(),
      },
      ownerHash: source,
    });
  }

  serializeNoteToBalanceEntry(
    symbol: string,
    decimals: number,
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
      decimals,
      owner,
      deliveryTag,
      lastUpdated: +dayjs(), // TODO: @vanja remove
    };
  }
}

export { Note, FullNoteData, DepositNote, AggregationInputNote, AggregationOutputNote, WithdrawalNote, CircuitInputNote, CircuitOutputNote };
