import { bigIntToDecimalString, decimalStringToBigInt } from "@/utils/decimal-conversions";
import { poseidonHash } from "@/utils/poseidon-hash";

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

type InputNote = {
  id: string;
  nullifier: string;
  owner: {
    babyJubjubPublicKey: {
      x: string;
      y: string;
      serialized?: string;
    };
    sharedSecret: string;
  };
  balance: {
    amount: string;
    token: string;
  };
};

type OutputNote = {
  id: string;
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

type FullNoteData = InputNote & OutputNote;

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

    return poseidonHash([this.owner.sharedSecret, this.owner.babyJubjubPublicKey.x, this.owner.babyJubjubPublicKey.y]);
  }

  static generateOwnerHash(owner: Owner): bigint {
    return poseidonHash([owner.babyJubjubPublicKey.x, owner.babyJubjubPublicKey.y, owner.sharedSecret]);
  }

  serializeInputNote(): InputNote {
    if (!this.owner) {
      throw new Error("Owner is not set");
    }

    if (!this.balance) {
      throw new Error("Balance is not set");
    }

    return {
      id: this.id.toString(),
      nullifier: this.nullifier.toString(),
      owner: {
        babyJubjubPublicKey: {
          x: this.owner.babyJubjubPublicKey.x.toString(),
          y: this.owner.babyJubjubPublicKey.y.toString(),
          serialized: `${this.owner.babyJubjubPublicKey.x}.${this.owner.babyJubjubPublicKey.y}`,
        },
        sharedSecret: this.owner.sharedSecret.toString(),
      },
      balance: {
        amount: this.balance.amount.toString(),
        token: this.balance.token.toString(),
      },
    };
  }

  // Used when sending aggregation request to aggregator backend
  serializeOutputNote(): OutputNote {
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
      id: this.id.toString(),
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
  static deserializeOutputNote(outputNote: OutputNote): Note {
    return new Note({
      ownerHash: outputNote.ownerHash,
      balance: {
        token: outputNote.balance.token,
        amount: outputNote.balance.amount,
      },
      deliveryTag: {
        ephemeralKey: outputNote.deliveryTag.ephemeralKey,
        viewTag: outputNote.deliveryTag.viewTag,
      },
    });
  }

  // Used when receiving notes from the trees repository to scan notes for ownership
  serializePublicNote(): PublicNote {
    if (!this.ownerHash) {
      throw new Error("Owner hash is not set or 0");
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
      ...this.serializeInputNote(),
      ...this.serializeOutputNote(),
    };
  }
}

export { Note, FullNoteData, PublicNote, InputNote, AuthenticatedNote, OutputNote };
