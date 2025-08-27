import { poseidon3 } from "poseidon-lite";

type Balance = {
  amount: bigint;
  token: bigint;
};

type BabyJubPubKey = {
  x: bigint;
  y: bigint;
};

type Owner = {
  babyJubPubKey: BabyJubPubKey;
  sharedSecret: bigint;
};

type DeliveryTag = {
  ephemeralKey: bigint;
  viewTag: bigint;
};

type PublicNote = {
  ownerHash: bigint;
} & DeliveryTag;

type DepositedNote = {
  ownerHash: bigint;
} & Balance &
  DeliveryTag;

type AuthenticatedNote = {
  ownerHash: bigint;
} & Balance &
  DeliveryTag;

type CircuitInputNote = {
  owner: Owner;
} & Balance;

type CircuitOutputNote = {
  ownerHash: bigint;
} & Balance;

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

    return poseidon3([this.ownerHash, this.balance.amount, this.balance.token]);
  }

  static generateOwnerHash(owner: Owner): bigint {
    return poseidon3([
      owner.babyJubPubKey.x,
      owner.babyJubPubKey.y,
      owner.sharedSecret,
    ]);
  }

  // Deposit note
  // =========================================================
  serializeDepositNote(): DepositedNote {
    return this.serializeAuthenticatedNote();
  }

  static deserializeDepositNote(depositedNote: DepositedNote): Note {
    return Note.deserializeAuthenticatedNote(depositedNote);
  }

  // Aggregation notes
  // =========================================================
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

  static deserializeAggregationInputNote(
    aggregationInputNote: AggregationInputNote
  ): Note {
    const note = new Note({
      ownerHash: Note.generateOwnerHash(aggregationInputNote.owner),
      balance: aggregationInputNote,
    });
    return note;
  }

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

  static deserializeAggregationOutputNote(
    aggregationOutputNote: AggregationOutputNote
  ): Note {
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
  serializeWithdrawalNote(): WithdrawalNote {
    return this.serializeAggregationInputNote();
  }

  static deserializeWithdrawalNote(withdrawalNote: WithdrawalNote): Note {
    return Note.deserializeAggregationInputNote(withdrawalNote);
  }

  // Circuit notes
  // =========================================================
  serializeCircuitInputNote(): CircuitInputNote {
    if (!this.owner) {
      throw new Error("Owner is not set");
    }

    if (!this.balance) {
      throw new Error("Balance is not set");
    }

    return {
      owner: {
        babyJubPubKey: this.owner.babyJubPubKey,
        sharedSecret: this.owner.sharedSecret,
      },
      ...this.balance,
    };
  }

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

  static deserializeAuthenticatedNote(
    authenticatedNote: AuthenticatedNote
  ): Note {
    const note = new Note({
      ownerHash: authenticatedNote.ownerHash,
      balance: {
        token: authenticatedNote.token,
        amount: authenticatedNote.amount,
      },
      deliveryTag: {
        ephemeralKey: authenticatedNote.ephemeralKey,
        viewTag: authenticatedNote.viewTag,
      },
    });
    return note;
  }

  // Public note
  // =========================================================
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
}

export { Note, FullNoteData };