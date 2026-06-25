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

type CurvyAccountData = {
  readonly id: string;
  readonly createdAt: number;
  readonly ownerAddress: string;
  readonly curvyHandle: CurvyId;
  scanCursors: ScanCursors;
};

type AdditionalAccountData = {
  password?: string;
  credId?: ArrayBuffer;
};

type SerializedCurvyAccount = {
  readonly id: string;
  readonly createdAt: number;
  readonly ownerAddress: string;
  readonly curvyHandle: CurvyId;
};

export type { CurvyAccountData, ScanCursors, ScanInfo, SerializedCurvyAccount, AdditionalAccountData, RefreshOptions };
