import { type Address, getProgramDerivedAddress } from "@solana/kit";
import { FEE_CONFIG_SEED } from "@/constants/solana";

/**
 * `FeeConfig` PDA — the authority-set cap (bps of the input amount) on the in-kind
 * fee the operator keeps from a bridged vault. Bridge instructions take it as an
 * optional account: pass the program id while it does not exist, in which case the
 * program only accepts `operator_fee == 0`.
 *
 * @example
 * const [feeConfig] = await deriveFeeConfigPda(programAddress);
 */
export async function deriveFeeConfigPda(programAddress: Address) {
  return getProgramDerivedAddress({
    programAddress,
    seeds: [FEE_CONFIG_SEED],
  });
}
