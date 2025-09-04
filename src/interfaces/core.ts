import type { RawAnnouncement } from "@/types/api";
import type {
  AuthenticatedNote,
  CoreScanReturnType,
  CoreSendReturnType,
  CoreViewerScanReturnType,
  CurvyKeyPairs,
  Note,
  NoteOwnershipData,
  NoteOwnershipProof,
  PublicNote,
} from "@/types/core";

interface ICore {
  generateKeyPairs(): CurvyKeyPairs;
  getCurvyKeys(s: string, v: string): CurvyKeyPairs;
  send(S: string, V: string): CoreSendReturnType;
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
