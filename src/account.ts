import dayjs from "dayjs";
import { sha256 } from "viem";
import type { SerializedCurvyAccount } from "@/types/account";
import type { CurvyKeyPairs } from "@/types/core";
import type { CurvyId } from "@/types/curvy";
import { textEncoder } from "@/utils/common";

type CurvyAccountInit = {
  keyPairs: Partial<CurvyKeyPairs>;
  curvyHandle: CurvyId | null;
  ownerAddress: string | null;
  createdAt?: number;
  passwordHash?: string;
  credId?: ArrayBuffer;
};

class CurvyAccount {
  readonly #keyPairs: CurvyKeyPairs;

  readonly curvyHandle: CurvyId | null;
  readonly ownerAddress: string | null;
  readonly createdAt: number;
  readonly id: string;

  readonly #passwordHash?: string;
  readonly #credId?: ArrayBuffer;

  constructor({ keyPairs, curvyHandle, ownerAddress, createdAt = +dayjs(), passwordHash, credId }: CurvyAccountInit) {
    this.#keyPairs = { S: "", V: "", s: "", v: "", babyJubjubPublicKey: "", ...keyPairs };
    this.curvyHandle = curvyHandle;
    this.ownerAddress = ownerAddress;
    this.createdAt = createdAt;
    this.id = sha256(textEncoder.encode(JSON.stringify(this.#keyPairs)));
    this.#passwordHash = passwordHash;
    this.#credId = credId;
  }

  get keyPairs() {
    return Object.freeze(this.#keyPairs);
  }

  get isPartial() {
    return !this.curvyHandle || !this.ownerAddress;
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

  serialize(): SerializedCurvyAccount {
    if (this.isPartial) {
      throw new Error("Cannot serialize a partial account!");
    }

    return {
      id: this.id,
      createdAt: this.createdAt,
      ownerAddress: this.ownerAddress!,
      curvyHandle: this.curvyHandle!,
    };
  }
}

export { CurvyAccount };
export type { CurvyAccountInit };
