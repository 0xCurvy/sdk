import { isAddress } from "@solana/kit";
import { NETWORK_FLAVOUR, type NETWORK_FLAVOUR_VALUES } from "@/constants/networks";
import { isValidEvmAddress } from "@/utils/address/isValidEvmAddress";

/**
 * Checks whether a recipient string is a valid address for the given network
 * flavour. Solana addresses are validated as base58 Ed25519 pubkeys; everything
 * else (including no flavour) is validated as an EVM hex address.
 *
 * @example
 * isValidAddressFormat("0x" + "a".repeat(40));                              // true (EVM default)
 * isValidAddressFormat("11111111111111111111111111111111", "solana");      // true
 * isValidAddressFormat("0x" + "a".repeat(40), "solana");                    // false
 */
const isValidAddressFormat = (recipient: string, flavour?: NETWORK_FLAVOUR_VALUES): boolean => {
  switch (flavour) {
    case NETWORK_FLAVOUR.SOLANA: {
      return isAddress(recipient);
    }
    default: {
      return isValidEvmAddress(recipient);
    }
  }
};

export { isValidAddressFormat };
