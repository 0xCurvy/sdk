import type { CurvyKeyPairs } from "@/types/core";
import type { SerializedCurvyWallet } from "@/types/wallet";

interface ICurvyWallet {
  readonly id: string;
  readonly createdAt: number;
  readonly ownerAddress: string;
  readonly curvyHandle: string;

  get keyPairs(): Readonly<CurvyKeyPairs>;

  authWithPassword(getPasswordHash: () => Promise<string>): Promise<boolean>;
  authWithCredId(getCredential: (id: ArrayBuffer) => Promise<Credential | null>): Promise<boolean>;

  serialize(): SerializedCurvyWallet;
}

export type { ICurvyWallet };
