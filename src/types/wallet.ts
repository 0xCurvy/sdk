import type { CurvyId } from "@/types/curvy";

type ScanCursors = {
  latest: number | undefined;
  oldest: number | undefined;
};

type ScanInfo = {
  scanCursors: ScanCursors;
  oldestCutoff: number;
};

type RefreshOptions = {
  signal?: AbortSignal;
  silent?: boolean;
};

type CurvyWalletData = {
  readonly id: string;
  readonly createdAt: number;
  readonly ownerAddress: string;
  readonly curvyHandle: CurvyId;
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
  readonly curvyHandle: CurvyId;
};

export type { CurvyWalletData, ScanCursors, ScanInfo, SerializedCurvyWallet, AdditionalWalletData, RefreshOptions };
