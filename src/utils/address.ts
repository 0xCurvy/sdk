import { computeAddress } from "ethers";
import { NETWORK_FLAVOUR, type NETWORK_FLAVOUR_VALUES } from "@/constants/networks";
import type { HexString } from "@/types/helper";
import { decimalStringToHex } from "./decimal-conversions";

/**
 * Checks if a given recipient string is a valid address format based on the network flavour.
 *  * Supports EVM (40 hex characters)
 */
const isValidAddressFormat = (recipient: string, flavour?: NETWORK_FLAVOUR_VALUES): recipient is HexString => {
  switch (flavour) {
    case NETWORK_FLAVOUR.EVM: {
      return /^0x[a-fA-F0-9]{40}$/.test(recipient);
    }
    default: {
      return /^0x[a-fA-F0-9]{40}$/.test(recipient);
    }
  }
};

const deriveAddress = (rawPubKey?: string, flavour?: NETWORK_FLAVOUR_VALUES) => {
  if (!rawPubKey || !flavour) {
    throw new Error("Couldn't derive address! Missing public key or network flavour.");
  }

  const pubKey = decimalStringToHex(rawPubKey, false);

  switch (flavour) {
    case NETWORK_FLAVOUR.EVM: {
      return computeAddress(pubKey) as HexString;
    }
    default: {
      throw new Error("Unknown network flavour when deriving address");
    }
  }
};

import { concat, keccak256 } from "ethers";

const computePrivateKeys = (r_string: string, s_string: string) => {
  const _r = BigInt(r_string);
  const _s = BigInt(s_string);

  const [s, v] = [hash([_s, _r]), hash([_r, _s])];

  if (s === v) throw new Error("Error generating keys: k === v !");

  return { s, v };
};

const hash = (_values: bigint[]) => {
  const values = _values.map((v) => `0x${v.toString(16).length % 2 === 0 ? v.toString(16) : `0${v.toString(16)}`}`);
  const MAX_OUTPUT_LENGTH = 252;
  const MIN_OUTPUT_LENGTH = 180;
  const MIN_VALID_VALUE = 10n ** 70n;

  const preImage = concat(values);
  const hashed = keccak256(preImage).replace("0x", "").slice(1);

  if (hashed.length * 4 > MAX_OUTPUT_LENGTH)
    throw new Error(`Error generating hash: length over ${MAX_OUTPUT_LENGTH} bits`);

  if (hashed.length * 4 < MIN_OUTPUT_LENGTH)
    throw new Error(`Error generating hash: length under ${MIN_OUTPUT_LENGTH} bits`);

  if (BigInt(`0x${hashed}`) < MIN_VALID_VALUE)
    throw new Error(`Error generating hash: hashed value under ${MIN_VALID_VALUE}`);

  return `0${hashed.padStart(MAX_OUTPUT_LENGTH / 4, "0")}`;
};

export { deriveAddress, computePrivateKeys, hash, isValidAddressFormat };
