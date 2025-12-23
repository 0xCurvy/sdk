import type { CurvyHandle } from "@/types";
import type { CurvyKeyPairs } from "@/types/core";
import type { SerializedCurvyWallet } from "@/types/wallet";

interface ICurvyWallet {
  readonly id: string;
  readonly createdAt: number;

  get curvyHandle(): CurvyHandle;
  get ownerAddress(): string;

  get keyPairs(): Readonly<CurvyKeyPairs>;
  get isPartial(): boolean;

  authWithPassword(getPasswordHash: () => Promise<string>): Promise<boolean>;
  authWithCredId(getCredential: (id: ArrayBuffer) => Promise<Credential | null>): Promise<boolean>;

  serialize(): SerializedCurvyWallet;
}

export type { ICurvyWallet };
