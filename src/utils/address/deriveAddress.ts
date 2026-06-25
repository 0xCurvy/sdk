import { publicKeyToAddress } from "viem/accounts";
import { NETWORK_FLAVOUR, type NETWORK_FLAVOUR_VALUES } from "@/constants/networks";
import type { HexString } from "@/types/helper";
import { deriveSolanaRecoveryPubkey } from "@/utils/address/deriveSolanaRecoveryPubkey";

/**
 * Derive an on-chain address from a raw SECP256k1 public key in "X.Y" decimal
 * coordinate format. EVM derivation produces a checksummed hex address; Solana
 * derivation produces a base58 recovery pubkey. Deterministic per input.
 *
 * @example
 * deriveAddress("12345678901234567890.98765432109876543210", "evm");    // "0x..."
 * deriveAddress("12345678901234567890.98765432109876543210", "solana"); // base58 string
 *
 * @throws if either the public key or the network flavour is missing/unknown.
 */
function deriveAddress(rawPubKey?: string, flavour?: NETWORK_FLAVOUR["EVM"]): HexString;
function deriveAddress(rawPubKey?: string, flavour?: NETWORK_FLAVOUR["SOLANA"]): string;
function deriveAddress(rawPubKey?: string, flavour?: NETWORK_FLAVOUR_VALUES): string {
  if (!rawPubKey || !flavour) {
    throw new Error("Couldn't derive address! Missing public key or network flavour.");
  }

  switch (flavour) {
    case NETWORK_FLAVOUR.EVM: {
      // viem's publicKeyToAddress strips the first 4 chars (`0x04`) expecting an
      // uncompressed pubkey (65 bytes = `04 || X || Y`)
      const [X, Y] = rawPubKey.split(".");
      const xHex = BigInt(X).toString(16).padStart(64, "0");
      const yHex = BigInt(Y).toString(16).padStart(64, "0");
      const pubKey = `0x04${xHex}${yHex}` as HexString;
      return publicKeyToAddress(pubKey);
    }
    case NETWORK_FLAVOUR.SOLANA: {
      return deriveSolanaRecoveryPubkey(rawPubKey);
    }
    default: {
      throw new Error("Unknown network flavour when deriving address");
    }
  }
}

export { deriveAddress };
