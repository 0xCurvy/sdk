import type { ICurvyWallet } from "@/interfaces/wallet";
import type { CurvyKeyPairs } from "@/types/core";
import type { CurvyHandle } from "@/types/curvy";
import type { SerializedCurvyWallet } from "@/types/wallet";

class CurvyWallet implements ICurvyWallet {
  readonly id: string;
  readonly createdAt: number;
  readonly ownerAddress: string;
  readonly curvyHandle: CurvyHandle;
  readonly #passwordHash?: string;
  readonly #credId?: ArrayBuffer;

  readonly #keyPairs: CurvyKeyPairs;

  constructor(
    id: string,
    createdAt: number,
    curvyHandle: CurvyHandle,
    ownerAddress: string,
    keyPairs: CurvyKeyPairs,
    passwordHash?: string,
    credId?: ArrayBuffer,
  ) {
    this.id = id;
    this.createdAt = createdAt;
    this.curvyHandle = curvyHandle;
    this.ownerAddress = ownerAddress;
    this.#keyPairs = keyPairs;
    this.#passwordHash = passwordHash;
    this.#credId = credId;
  }

  get keyPairs() {
    return Object.freeze(this.#keyPairs);
  }

  async authWithPassword(getPasswordHash: () => Promise<string>) {
    if (!this.#passwordHash) return false;
    return this.#passwordHash === (await getPasswordHash());
  }

  async authWithCredId(getCredential: (id: ArrayBuffer) => Promise<Credential | null>) {
    if (!this.#credId) return false;

    return getCredential(this.#credId)
      .then((cred) => cred instanceof PublicKeyCredential)
      .catch(() => false);
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
