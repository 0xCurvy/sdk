import type { RawAnnouncement } from "@/types/api";
import type {
  CoreScanReturnType,
  CoreSendReturnType,
  CoreViewerScanReturnType,
  CurvyKeyPairs,
  NoteOwnershipData,
  NoteOwnershipProof,
  Signature,
} from "@/types/core";
import type { StringifyBigInts } from "@/types/helper";
import type { AuthenticatedNote, Note, PublicNote } from "@/types/note";

interface ICore {
  generateKeyPairs(): CurvyKeyPairs;
  getCurvyKeys(s: string, v: string): CurvyKeyPairs;
  send(S: string, V: string): CoreSendReturnType;
  sendNote(S: string, V: string, noteData: { ownerBabyJubjubPublicKey: string; amount: bigint; token: bigint }): Note;
  signWithBabyJubjubPrivateKey(message: bigint, babyJubjubPrivateKey: string): StringifyBigInts<Signature>;
  scan(s: string, v: string, announcements: RawAnnouncement[]): CoreScanReturnType;
  viewerScan(v: string, S: string, announcements: RawAnnouncement[]): CoreViewerScanReturnType;
  isValidBN254Point(point: string): boolean;
  isValidSECP256k1Point(point: string): boolean;

  getNoteOwnershipData(publicNotes: PublicNote[], s: string, v: string): NoteOwnershipData[];
  generateNoteOwnershipProof(ownershipData: NoteOwnershipData[], babyJubPublicKey: string): Promise<NoteOwnershipProof>;
  unpackAuthenticatedNotes(
    s: string,
    v: string,
    notes: AuthenticatedNote[],
    babyJubPublicKey: [string, string],
  ): Note[];
  version(): string;
}

export type { ICore };
