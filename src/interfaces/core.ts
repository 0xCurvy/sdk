import type { RawAnnouncement } from "@/types/api";
import type { CoreScanReturnType, CoreSendReturnType, CoreViewerScanReturnType, CurvyKeyPairs, Signature } from "@/types/core";
import type { StringifyBigInts } from "@/types/helper";
import { Note } from "@/types/note";

interface ICore {
  generateKeyPairs(): CurvyKeyPairs;
  getCurvyKeys(s: string, v: string): CurvyKeyPairs;
  send(S: string, V: string): CoreSendReturnType;
  sendNote(S: string, V: string, noteData: { ownerBabyJubPublicKey: string; amount: bigint; token: bigint }): Note;
  signWithBabyJubPrivateKey(message: bigint, babyJubPrivateKey: string): StringifyBigInts<Signature>;
  scan(s: string, v: string, announcements: RawAnnouncement[]): CoreScanReturnType;
  viewerScan(v: string, S: string, announcements: RawAnnouncement[]): CoreViewerScanReturnType;
  isValidBN254Point(point: string): boolean;
  isValidSECP256k1Point(point: string): boolean;
  version(): string;
}

export type { ICore };
