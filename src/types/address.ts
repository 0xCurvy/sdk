import type { RawAnnouncement } from "@/types/api";
import type { HexString } from "@/types/helper";

type ScannedAnnouncement = RawAnnouncement & {
  publicKey: string;
  walletId: string;
  address: HexString;
};

type AnnouncementBase = {
  ephemeralPublicKey: string;
  viewTag: string;
  recipientStealthPublicKey: string;
};

interface CurvyAddress extends ScannedAnnouncement {}

interface MinifiedCurvyAddress extends Omit<CurvyAddress, "ephemeralPublicKey" | "publicKey"> {
  ephemeralPublicKey: Uint8Array;
  publicKey: Uint8Array;
}

const isValidAddressFormat = (recipient: string): recipient is HexString => {
  return /^0x(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/.test(recipient);
};

export { isValidAddressFormat };

export type { AnnouncementBase, ScannedAnnouncement, CurvyAddress, MinifiedCurvyAddress };
