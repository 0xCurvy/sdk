/**
 * Solana namespace barrel — the public surface for everything Solana-related
 * in the SDK. Re-exports from the natural-home locations:
 *
 *   - `@/constants/solana` — program IDs, seeds, mints, Anchor discriminators
 *   - `@/utils/solana`     — byte encoding / account-meta / Borsh helpers
 *   - `@/types/solana`     — shared Solana types (`AcrossQuoteParams`, etc.)
 *
 * Plus the Solana-specific recovery flow, which lives alongside this barrel:
 *
 *   - `./pda`                  — PDA derivations (vault, meta, Across, Relay, config)
 *   - `./recovery-identifier`  — secp256k1-derived recovery identifier
 *   - `./recovery-signature`   — recover_sol / recover_spl signing
 *   - `./recovery-instruction` — kit Instruction builders for recovery calls
 */
export {
  ACROSS_PROGRAM_ID,
  ALLOWED_LIFI_BRIDGES,
  ARBITRUM_CHAIN_ID,
  CONFIG_SEED,
  DEPOSIT_NATIVE_DISC,
  IX_DISC,
  LIFI_SOLANA_CHAIN_ID,
  NATIVE_SOL_MINT,
  PORTAL_META_SEED,
  PORTAL_SEED,
  RECOVER_SOL_DISC,
  RECOVER_SPL_DISC,
  RECOVERY_DOMAIN,
  RELAY_PROGRAM_ID,
  WSOL_MINT,
} from "@/constants/solana";
export type { AcrossQuoteParams, SolanaPortalBalance } from "@/types/solana";
export {
  accountMeta,
  amountToBytes32BE,
  concatBytes,
  encodeAcrossQuoteParams,
  encodeBorshVec,
  encodeU32LE,
  encodeU64LE,
  evmAddressToBytes32,
  serializeAcrossDepositSeedData,
} from "@/utils/solana";
export {
  deriveAcrossDelegatePda,
  deriveAcrossEventAuthorityPda,
  deriveAcrossStatePda,
  deriveConfigPda,
  derivePortalMetaPda,
  deriveRelayDepositoryPda,
  deriveRelayVaultPda,
  deriveVaultPda,
  ownerHashToBytes,
} from "./pda";
export { deriveRecoveryIdentifier } from "./recovery-identifier";
export {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  buildRecoverSolInstruction,
  buildRecoverSplInstruction,
  deriveAssociatedTokenAddress,
  SYSTEM_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
} from "./recovery-instruction";
export { signSolRecovery, signSplRecovery } from "./recovery-signature";
