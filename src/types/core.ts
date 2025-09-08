import type { Groth16Proof } from "snarkjs";
import type { PublicSignals } from "snarkjs/index";
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
  babyJubjubPubKey: string;
};

type CurvyPrivateKeys = {
  s: string;
  v: string;
};

type CurvyPublicKeys = {
  S: string;
  V: string;
  babyJubjubPubKey: string;
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

type PublicNote = {
  ownerHash: string;
  viewTag: string;
  ephemeralKey: string;
};

type NoteOwnershipData = {
  ownerHash: string;
  sharedSecret: bigint;
};

type NoteOwnershipProof = {
  proof: Groth16Proof;
  publicSignals: PublicSignals;
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
  PublicNote,
  NoteOwnershipData,
  NoteOwnershipProof,
};
