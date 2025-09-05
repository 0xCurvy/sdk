import type { RawAnnouncement } from "@/types/api";
import type { HexString } from "@/types/helper";
import { NETWORK_ENVIRONMENT } from "../constants/networks";

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

interface CurvyAddress extends ScannedAnnouncement {
  lastScannedAt: {
    [NETWORK_ENVIRONMENT.MAINNET]: number;
    [NETWORK_ENVIRONMENT.TESTNET]: number;
  };
}

interface MinifiedCurvyAddress extends Omit<CurvyAddress, "ephemeralPublicKey" | "publicKey"> {
  ephemeralPublicKey: Uint8Array;
  publicKey: Uint8Array;
}

const isValidAddressFormat = (recipient: string): recipient is HexString => {
  return /^0x(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/.test(recipient);
};

export { isValidAddressFormat };

export type { AnnouncementBase, ScannedAnnouncement, CurvyAddress, MinifiedCurvyAddress };
