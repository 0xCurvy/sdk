import type { ICurvyWallet } from "@/interfaces/wallet";
import type { CurvyKeyPairs } from "@/types/core";
import type { CurvyHandle } from "@/types/curvy";
import type { SerializedCurvyWallet } from "@/types/wallet";

class CurvyWallet implements ICurvyWallet {
  readonly id: string;
  readonly createdAt: number;
  readonly ownerAddress: string;
  readonly curvyHandle: CurvyHandle;

  readonly #keyPairs: CurvyKeyPairs;

  constructor(id: string, createdAt: number, curvyHandle: CurvyHandle, ownerAddress: string, keyPairs: CurvyKeyPairs) {
    this.id = id;
    this.createdAt = createdAt;
    this.curvyHandle = curvyHandle;
    this.ownerAddress = ownerAddress;
    this.#keyPairs = keyPairs;
  }

  get keyPairs() {
    return this.#keyPairs;
  }

  serialize(): SerializedCurvyWallet {
    return {
      id: this.id,
      createdAt: this.createdAt,
      ownerAddress: this.ownerAddress,
      curvyHandle: this.curvyHandle,
    };
  }
}

export { CurvyWallet };
