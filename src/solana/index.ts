/**
 * Solana namespace barrel — the public surface for everything Solana-related
 * in the SDK. Re-exports from the natural-home locations:
 *
 *   - `@/constants/solana` — program IDs, seeds, mints, Anchor discriminators
 *   - `@/utils/encoding`   — byte encoding / account-meta / Borsh helpers
 *   - `@/types/solana`     — shared Solana types (`AcrossQuoteParams`, etc.)
 *
 * Plus the Solana-specific recovery flow — PDA derivation, the recovery
 * identifier, recover_sol/recover_spl signing, and the kit instruction
 * builders — each of which lives one-per-file alongside this barrel.
 */
export { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system";
export { ASSOCIATED_TOKEN_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
export {
  ACROSS_PROGRAM_ID,
  ALLOWED_LIFI_BRIDGES,
  ARBITRUM_CHAIN_ID,
  CONFIG_SEED,
  DEPOSIT_NATIVE_DISC,
  DEPOSIT_TOKEN_DISC,
  ECO_FUND_DISC,
  ECO_PROGRAM_ID,
  IX_DISC,
  LIFI_SOLANA_CHAIN_ID,
  NATIVE_SOL_MINT,
  PORTAL_META_SEED,
  PORTAL_SEED,
  RECOVER_SOL_DISC,
  RECOVER_SPL_DISC,
  RECOVERY_DOMAIN,
  RELAY_PROGRAM_ID,
  SOLANA_ONCHAIN_DECIMALS,
  TOKEN_2022_PROGRAM_ADDRESS,
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
} from "@/utils/encoding";
export { buildRecoverSolInstruction } from "./buildRecoverSolInstruction";
export { buildRecoverSplInstruction } from "./buildRecoverSplInstruction";
export { deriveAcrossDelegatePda } from "./deriveAcrossDelegatePda";
export { deriveAcrossEventAuthorityPda } from "./deriveAcrossEventAuthorityPda";
export { deriveAcrossStatePda } from "./deriveAcrossStatePda";
export { deriveAssociatedTokenAddress } from "./deriveAssociatedTokenAddress";
export { deriveConfigPda } from "./deriveConfigPda";
export { derivePortalMetaPda } from "./derivePortalMetaPda";
export { deriveRecoveryIdentifier } from "./deriveRecoveryIdentifier";
export { deriveRelayDepositoryPda } from "./deriveRelayDepositoryPda";
export { deriveRelayVaultPda } from "./deriveRelayVaultPda";
export { deriveVaultPda } from "./deriveVaultPda";
export { ownerHashToBytes } from "./ownerHashToBytes";
export { signSolRecovery } from "./signSolRecovery";
export { signSplRecovery } from "./signSplRecovery";
