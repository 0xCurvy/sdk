import { type Address, getAddressEncoder } from "@solana/kit";
import { invariant } from "@/utils/invariant";

/**
 * Encode a `recover_sol` or `recover_spl` instruction payload.
 *
 * Layout matches the Anchor Borsh encoding expected by the on-chain handlers:
 *   [disc(8)][ownerHash(32)][recoveryIdentifier(32)][recoveryId(1)][signature(64)]
 */
export function encodeRecoveryData(
  discriminator: Uint8Array,
  ownerHash: Uint8Array,
  recoveryIdentifier: Address,
  recoveryId: number,
  signature: Uint8Array,
): Uint8Array {
  invariant(ownerHash.length === 32, "ownerHash must be 32 bytes");
  invariant(signature.length === 64, "signature must be 64 bytes");

  const recoveryIdentifierBytes = getAddressEncoder().encode(recoveryIdentifier) as Uint8Array;

  const data = new Uint8Array(8 + 32 + 32 + 1 + 64);
  data.set(discriminator, 0);
  data.set(ownerHash, 8);
  data.set(recoveryIdentifierBytes, 40);
  data[72] = recoveryId;
  data.set(signature, 73);
  return data;
}
