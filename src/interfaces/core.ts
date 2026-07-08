import type { Note } from "@/note";
import type {
  CoreScanReturnType,
  CoreSendReturnType,
  CoreViewerScanReturnType,
  CurvyKeyPairs,
  Signature,
} from "@/types/core";
import type { StringifyBigInts } from "@/types/helper";

type RawAnnouncement = {
  viewTag: string;
  ephemeralPublicKey: string;
};

/** Recipient + value inputs for `sendNote` — an outgoing stealth note before delivery. */
type SendNoteData = { ownerBabyJubjubPublicKey: string; amount: bigint; token: bigint };

/** On-chain delivery tag used to trial-decrypt a note (`ephemeralKey` = packed "x.y" key, `viewTag` = hex). */
type NoteDeliveryTag = { ephemeralKey: string; viewTag: string };

interface ICore {
  generateKeyPairs(): Promise<CurvyKeyPairs>;
  getCurvyKeys(s: string, v: string): Promise<CurvyKeyPairs>;
  send(S: string, V: string): Promise<CoreSendReturnType>;
  sendNote(S: string, V: string, noteData: SendNoteData): Promise<Note>;
  getBabyJubjubPublicKey(babyJubjubPrivateKey: string): Promise<string>;
  signWithBabyJubjubPrivateKey(message: bigint, babyJubjubPrivateKey: string): Promise<StringifyBigInts<Signature>>;
  scan(s: string, v: string, announcements: RawAnnouncement[]): Promise<CoreScanReturnType>;
  /** Trial-decrypt notes by their on-chain delivery tag (`R` as the packed "x.y" key, viewTag as hex). */
  scanNotes(s: string, v: string, noteData: NoteDeliveryTag[]): Promise<CoreScanReturnType>;
  viewerScan(v: string, S: string, announcements: RawAnnouncement[]): Promise<CoreViewerScanReturnType>;
  isValidBN254Point(point: string): boolean;
  isValidSECP256k1Point(point: string): boolean;
  version(): string;
}

export type { ICore, NoteDeliveryTag, RawAnnouncement, SendNoteData };
