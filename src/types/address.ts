import { NETWORK_ENVIRONMENT, NETWORK_FLAVOUR, type NETWORK_FLAVOUR_VALUES } from "@/constants/networks";
import type { Network, RawAnnouncement } from "@/types/api";
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

type GetStealthAddressReturnType = {
  address: HexString;
  recipientStealthPublicKey: string;
  viewTag: string;
  ephemeralPublicKey: string;
  network: Network;
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

/**
 * Checks if a given recipient string is a valid address format based on the specified network flavour.
 *  * Supports EVM (40 hex characters) and StarkNet (64 hex characters) address formats.
 *  * If no flavour is specified, it does a OR check against both formats.
 */
const isValidAddressFormat = (recipient: string, flavour?: NETWORK_FLAVOUR_VALUES): recipient is HexString => {
  switch (flavour) {
    case NETWORK_FLAVOUR.EVM: {
      return /^0x[a-fA-F0-9]{40}$/.test(recipient);
    }
    case NETWORK_FLAVOUR.STARKNET: {
      return /^0x[a-fA-F0-9]{64}$/.test(recipient);
    }
    default: {
      return /^0x(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/.test(recipient);
    }
  }
};

export { isValidAddressFormat };

export type { AnnouncementBase, ScannedAnnouncement, CurvyAddress, MinifiedCurvyAddress, GetStealthAddressReturnType };
