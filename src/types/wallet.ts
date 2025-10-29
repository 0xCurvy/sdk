import type { CurvyHandle } from "@/types/curvy";

type ScanCursors = {
  latest: number | undefined;
  oldest: number | undefined;
};

type ScanInfo = {
  scanCursors: ScanCursors;
  oldestCutoff: number;
};

type CurvyWalletData = {
  readonly id: string;
  readonly createdAt: number;
  readonly ownerAddress: string;
  readonly curvyHandle: CurvyHandle;
  scanCursors: ScanCursors;
};

type AdditionalWalletData = {
  password?: string;
  credId?: ArrayBuffer;
};

type SerializedCurvyWallet = {
  readonly id: string;
  readonly createdAt: number;
  readonly ownerAddress: string;
  readonly curvyHandle: CurvyHandle;
};

export type { CurvyWalletData, ScanCursors, ScanInfo, SerializedCurvyWallet, AdditionalWalletData };
