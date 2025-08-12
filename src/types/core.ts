import type { HexString } from "@/types/helper";

type PublicKey = {
  spendingKey: string;
  viewingKey: string;
};

type CoreLegacyKeyPairs = {
  k: string;
  v: string;
  K: string;
  V: string;
};

type CurvyPrivateKeys = {
  s: string;
  v: string;
};
type CurvyPublicKeys = {
  S: string;
  V: string;
};
type CurvyKeyPairs = CurvyPrivateKeys & CurvyPublicKeys;

type CoreSendReturnType = {
  r: string;
  R: string;
  viewTag: string;
  spendingPubKey: string;
};

type CoreScanArgs = {
  k: string;
  v: string;
  Rs: Array<string>;
  viewTags: Array<string>;
};
type CoreScanReturnType = {
  spendingPubKeys: Array<string>;
  spendingPrivKeys: Array<HexString>;
};

type CoreViewerScanArgs = {
  v: string;
  K: string;
  Rs: Array<string>;
  viewTags: Array<string>;
};
type CoreViewerScanReturnType = {
  spendingPubKeys: Array<string>;
};

export type {
  PublicKey,
  CurvyKeyPairs,
  CurvyPublicKeys,
  CoreLegacyKeyPairs,
  CurvyPrivateKeys,
  CoreSendReturnType,
  CoreScanArgs,
  CoreScanReturnType,
  CoreViewerScanArgs,
  CoreViewerScanReturnType,
};
