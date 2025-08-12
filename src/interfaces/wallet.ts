import type { CurvyKeyPairs } from "@/types/core";
import type { SerializedCurvyWallet } from "@/types/wallet";

interface ICurvyWallet {
  readonly id: string;
  readonly createdAt: number;
  readonly ownerAddress: string;
  readonly curvyHandle: string;

  get keyPairs(): CurvyKeyPairs;

  serialize(): SerializedCurvyWallet;
}

export type { ICurvyWallet };
