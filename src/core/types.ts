import type { Note } from "@/note";
import type { HexString, StringifyBigInts } from "@/types/helper";

export type Signature = {
  S: bigint;
  R8: bigint[];
};

export type CurvyPrivateKeys = {
  s: string;
  v: string;
};

export type CurvyPublicKeys = {
  S: string;
  V: string;
  babyJubjubPublicKey: string;
};

export type CurvyKeyPairs = CurvyPrivateKeys & CurvyPublicKeys;

export type CoreSendReturnType = {
  r: string;
  R: string;
  viewTag: string;
  spendingPubKey: string;
};

export type CoreScanReturnType = {
  spendingPubKeys: string[];
  spendingPrivKeys: HexString[];
};

export type CoreViewerScanReturnType = {
  spendingPubKeys: string[];
};

export type RawAnnouncement = {
  viewTag: string;
  ephemeralPublicKey: string;
};

/** Recipient and value inputs for an outgoing stealth note. */
export type SendNoteData = { ownerBabyJubjubPublicKey: string; amount: bigint; token: bigint };

/** Delivery tag used to trial-decrypt an announced note. */
export type NoteDeliveryTag = { ephemeralKey: string; viewTag: string };

/** Cryptographic operations used by SDK actions. */
export interface CoreAdapter {
  generateKeyPairs(): Promise<CurvyKeyPairs>;
  getCurvyKeys(s: string, v: string): Promise<CurvyKeyPairs>;
  send(S: string, V: string): Promise<CoreSendReturnType>;
  sendNote(S: string, V: string, noteData: SendNoteData): Promise<Note>;
  getBabyJubjubPublicKey(babyJubjubPrivateKey: string): Promise<string>;
  signWithBabyJubjubPrivateKey(message: bigint, babyJubjubPrivateKey: string): Promise<StringifyBigInts<Signature>>;
  scan(s: string, v: string, announcements: RawAnnouncement[]): Promise<CoreScanReturnType>;
  scanNotes(s: string, v: string, noteData: NoteDeliveryTag[]): Promise<CoreScanReturnType>;
  viewerScan(v: string, S: string, announcements: RawAnnouncement[]): Promise<CoreViewerScanReturnType>;
  isValidBN254Point(point: string): boolean;
  isValidSECP256k1Point(point: string): boolean;
  version(): string;
}
