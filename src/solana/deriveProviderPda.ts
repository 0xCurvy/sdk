import { type Address, getBase58Encoder, getProgramDerivedAddress } from "@solana/kit";
import { PROVIDER_SEED } from "@/constants/solana";

/**
 * `ProviderEntry` PDA — the authority-managed allowlist entry for one LiFi provider
 * program (e.g. Eco). `bridge_eco_spl` requires an enabled entry for the provider it
 * CPIs into, so a provider redeploy is fixed with `set_provider`, not a program upgrade.
 *
 * @example
 * const [entry] = await deriveProviderPda(curvyProgram, ecoProgram);
 */
export async function deriveProviderPda(programAddress: Address, providerProgram: Address) {
  return getProgramDerivedAddress({
    programAddress,
    seeds: [PROVIDER_SEED, getBase58Encoder().encode(providerProgram)],
  });
}
