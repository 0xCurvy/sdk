import type { Groth16Proof } from "snarkjs";
import type { PublicSignals } from "snarkjs/index";
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
  bJJPublicKey: string;
};

type CurvyPrivateKeys = {
  s: string;
  v: string;
};
type CurvyPublicKeys = {
  S: string;
  V: string;
  bJJPublicKey: string;
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

type AuthenticatedNote = {
  ownerHash: string;
  viewTag: string;
  ephemeralKey: string;
  token: string;
  amount: string;
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

type Note = {
  owner: {
    babyJubPublicKey: [string, string];
    sharedSecret: string;
  };
  amount: string;
  token: string;
  viewTag: string;
  ephemeralKey: string;
};

type UnpackedNote = Note & {
  ownerHash: string;
};

type OutputNote = {
  ownerHash: string;
  amount: string;
  token: string;
  viewTag: string;
  ephemeralKey: string;
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
  AuthenticatedNote,
  Note,
  OutputNote,
  UnpackedNote,
  PublicNote,
  NoteOwnershipData,
  NoteOwnershipProof,
};
