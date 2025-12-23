import dayjs from "dayjs";
import { v4 as uuidV4 } from "uuid";
import type { ICurvyWallet } from "@/interfaces/wallet";
import type { CurvyKeyPairs } from "@/types/core";
import type { CurvyHandle } from "@/types/curvy";
import type { SerializedCurvyWallet } from "@/types/wallet";

class CurvyWallet implements ICurvyWallet {
  readonly #keyPairs: CurvyKeyPairs;

  readonly #curvyHandle: CurvyHandle | null;
  readonly #ownerAddress: string | null;
  readonly createdAt: number;
  readonly id: string;

  readonly #passwordHash?: string;
  readonly #credId?: ArrayBuffer;

  constructor(
    keyPairs: Partial<CurvyKeyPairs>,
    curvyHandle: CurvyHandle | null,
    ownerAddress: string | null,
    createdAt = +dayjs(),
    passwordHash?: string,
    credId?: ArrayBuffer,
  ) {
    this.#keyPairs = { S: "", V: "", s: "", v: "", babyJubjubPublicKey: "", ...keyPairs };
    this.#curvyHandle = curvyHandle;
    this.#ownerAddress = ownerAddress;
    this.createdAt = createdAt;
    this.id = uuidV4();
    this.#passwordHash = passwordHash;
    this.#credId = credId;
  }

  get keyPairs() {
    return Object.freeze(this.#keyPairs);
  }

  get curvyHandle(): CurvyHandle {
    if (!this.#curvyHandle) {
      throw new Error("Curvy handle is not set");
    }

    return this.#curvyHandle;
  }

  get ownerAddress(): string {
    if (!this.#ownerAddress) {
      throw new Error("Owner address is not set");
    }
    return this.#ownerAddress;
  }

  get isPartial() {
    return !this.#curvyHandle || !this.#ownerAddress;
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
    if (this.isPartial) {
      throw new Error("Cannot serialize a partial wallet!");
    }

    return {
      id: this.id,
      createdAt: this.createdAt,
      ownerAddress: this.ownerAddress,
      curvyHandle: this.curvyHandle,
    };
  }
}

export { CurvyWallet };
