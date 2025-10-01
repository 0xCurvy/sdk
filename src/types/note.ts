import dayjs from "dayjs";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { HexString, StringifyBigInts } from "@/types/helper";
import type { NoteBalanceEntry } from "@/types/storage";
import { bigIntToDecimalString, decimalStringToBigInt } from "@/utils/decimal-conversions";
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
  };
};

type AuthenticatedNote = {
  ownerHash: string;
  balance: {
    amount: string;
    token: string;
  };
  deliveryTag: {
    ephemeralKey: string;
    viewTag: string;
  };
};

type DepositNote = {
  ownerHash: string;
  balance: {
    amount: string;
    token: string;
  };
  deliveryTag: {
    ephemeralKey: string;
    viewTag: string;
  };
};

type AggregationInputNote = {
  owner: {
    babyJubjubPublicKey: {
      x: string;
      y: string;
    };
    sharedSecret: string;
  };
  balance: {
    amount: string;
    token: string;
  };
};

type AggregationOutputNote = {
  ownerHash: string;
  balance: {
    amount: string;
    token: string;
  };
  deliveryTag: {
    ephemeralKey: string;
    viewTag: string;
  };
};

type WithdrawalNote = {
  owner: {
    babyJubjubPublicKey: {
      x: string;
      y: string;
    };
    sharedSecret: string;
  };
  balance: {
    amount: string;
    token: string;
  };
};

type CircuitInputNote = {
  owner: {
    babyJubjubPublicKey: {
      x: string;
      y: string;
    };
    sharedSecret: string;
  };
  balance: {
    amount: string;
    token: string;
  };
};

type CircuitOutputNote = {
  ownerHash: string;
  balance: {
    amount: string;
    token: string;
  };
};

type FullNoteData = {
  owner: {
    babyJubjubPublicKey: {
      x: string;
      y: string;
    };
    sharedSecret: string;
  };
  ownerHash: string;
  balance: {
    amount: string;
    token: string;
  };
  deliveryTag: {
    ephemeralKey: string;
    viewTag: string;
  };
};

class Note {
  ownerHash: bigint;
  balance?: Balance;
  owner?: Owner;
  deliveryTag?: DeliveryTag;

  constructor(data: Partial<FullNoteData>) {
    if (data.owner) {
      if (data.ownerHash) {
        this.ownerHash = BigInt(data.ownerHash);
      } else {
        this.ownerHash = Note.generateOwnerHash({
          babyJubjubPublicKey: {
            x: BigInt(data.owner.babyJubjubPublicKey.x),
            y: BigInt(data.owner.babyJubjubPublicKey.y),
          },
          sharedSecret: BigInt(data.owner.sharedSecret),
        });
      }
      this.owner = {
        babyJubjubPublicKey: {
          x: BigInt(data.owner.babyJubjubPublicKey.x),
          y: BigInt(data.owner.babyJubjubPublicKey.y),
        },
        sharedSecret: BigInt(data.owner.sharedSecret),
      };
    } else if (data.ownerHash) {
      this.ownerHash = BigInt(data.ownerHash);
    } else {
      throw new Error("Owner is not set");
    }

    if (data.balance)
      this.balance = {
        amount: BigInt(data.balance.amount),
        token: BigInt(data.balance.token),
      };

    if (data.deliveryTag)
      this.deliveryTag = {
        ephemeralKey: decimalStringToBigInt(data.deliveryTag.ephemeralKey),
        viewTag: BigInt(
          !data.deliveryTag.viewTag.startsWith("0x") ? `0x${data.deliveryTag.viewTag}` : data.deliveryTag.viewTag,
        ),
      };
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
    return new Note({
      owner: aggregationInputNote.owner,
      balance: aggregationInputNote.balance,
      deliveryTag: {
        ephemeralKey: "0.0",
        viewTag: "0x0",
      },
    });
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
        ephemeralKey: bigIntToDecimalString(this.deliveryTag.ephemeralKey),
        viewTag: this.deliveryTag.viewTag.toString(16),
      },
    };
  }

  // Used when receiving aggregation output note from aggregator backend
  static deserializeAggregationOutputNote(aggregationOutputNote: AggregationOutputNote): Note {
    return new Note({
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
        ephemeralKey: bigIntToDecimalString(this.deliveryTag.ephemeralKey),
        viewTag: this.deliveryTag.viewTag.toString(16),
      },
    };
  }

  // Used when receiving note with balances after verification of clientside proof of ownership
  static deserializeAuthenticatedNote(authenticatedNote: StringifyBigInts<AuthenticatedNote>): Note {
    return new Note({
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
        ephemeralKey: bigIntToDecimalString(this.deliveryTag.ephemeralKey),
        viewTag: this.deliveryTag.viewTag.toString(16),
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
        ephemeralKey: bigIntToDecimalString(this.deliveryTag.ephemeralKey),
        viewTag: this.deliveryTag.viewTag.toString(16),
      },
    };
  }

  // Used when receiving notes from the trees repository to scan notes for ownership
  static deserializePublicNote(publicNote: PublicNote): Note {
    return new Note({
      ownerHash: publicNote.ownerHash,
      deliveryTag: {
        ephemeralKey: publicNote.deliveryTag.ephemeralKey,
        viewTag: publicNote.deliveryTag.viewTag,
      },
    });
  }

  static fromNoteBalanceEntry({ balance, owner, deliveryTag, erc1155TokenId }: NoteBalanceEntry): Note {
    return new Note({
      balance: { amount: balance.toString(), token: erc1155TokenId!.toString() },
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

  toBalanceEntry(
    symbol: string,
    decimals: number,
    walletId: string,
    environment: NETWORK_ENVIRONMENT_VALUES,
    networkSlug: string,
    currencyAddress: HexString,
  ): NoteBalanceEntry {
    if (!this.balance || !this.owner || !this.deliveryTag) {
      throw new Error("Note is not fully initialized");
    }
    const {
      balance: { token, amount },
      ownerHash,
    } = this;

    const { owner, deliveryTag } = this.serializeFullNote();

    return {
      walletId,
      source: `0x${ownerHash.toString(16)}`,
      type: BALANCE_TYPE.NOTE,
      networkSlug,
      environment,
      erc1155TokenId: token,
      currencyAddress,
      symbol,
      balance: BigInt(amount),
      decimals,
      owner,
      deliveryTag,
      lastUpdated: +dayjs(), // TODO: @vanja remove
    };
  }
}

export {
  Note,
  FullNoteData,
  DepositNote,
  PublicNote,
  AggregationInputNote,
  AuthenticatedNote,
  AggregationOutputNote,
  WithdrawalNote,
  CircuitInputNote,
  CircuitOutputNote,
};
