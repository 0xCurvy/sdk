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

    return poseidon3([this.ownerHash, this.balance.amount, this.balance.token]);
  }

  static generateOwnerHash(owner: Owner): bigint {
    return poseidon3([owner.babyJubPubKey.x, owner.babyJubPubKey.y, owner.sharedSecret]);
  }

  // Deposit note
  // =========================================================

  // Used when sending deposit request to aggregator backend
  serializeDepositNote(): DepositNote {
    return this.serializeAuthenticatedNote();
  }

  // TODO: Write when it is used
  static deserializeDepositNote(depositNote: DepositNote): Note {
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

  // TODO: Write when it is used
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

  // TODO: Write when it is used
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
        babyJubPubKey: this.owner.babyJubPubKey,
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
  static deserializeAuthenticatedNote(authenticatedNote: AuthenticatedNote): Note {
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

  // Used when receiving notes from the note repository to scan notes for ownership
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

  // Used when receiving notes from the note repository to scan notes for ownership
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
