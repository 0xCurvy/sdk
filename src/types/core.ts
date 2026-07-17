import type { HexString } from "@/types/helper";

type Signature = {
  S: bigint;
  R8: bigint[];
};

type CoreLegacyKeyPairs = {
  k: string;
  v: string;
  K: string;
  V: string;
  babyJubjubPublicKey: string;
};

type CurvyPrivateKeys = {
  s: string;
  v: string;
};

type CurvyPublicKeys = {
  S: string;
  V: string;
  babyJubjubPublicKey: string;
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

type CircuitConfig = {
  /** @deprecated Legacy service only; the current SDK requires the Rust witness graph. */
  wasmPath?: string;
  /** Curvy's versioned Rust witness evaluator format. */
  witnessEngine?: "curvy-graph-v1";
  witnessGraphPath?: string;
  witnessGraphSha256?: string;
  zkeyPath?: string;
  /** SHA-256 of the exact zkey bytes, published with the rotatable protocol metadata. */
  zkeySha256?: string;
  vkeyPath?: string;
  treeDepth: number;
  maxInputs: number;
  maxOutputs: number;
  batchSize: number;
  groupFee: number;
};

export type {
  Signature,
  CurvyKeyPairs,
  CurvyPublicKeys,
  CoreLegacyKeyPairs,
  CurvyPrivateKeys,
  CoreSendReturnType,
  CoreScanArgs,
  CoreScanReturnType,
  CoreViewerScanArgs,
  CoreViewerScanReturnType,
  CircuitConfig,
};
