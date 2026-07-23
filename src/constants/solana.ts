/**
 * Shared constants for Solana portal operations.
 *
 * This is the single source of truth for every Solana-related constant used
 * across the SDK (recovery flow) and the backend (bridge flow). Seeds, program
 * addresses, token mints, and Anchor instruction discriminators all live here
 * so consumers import named constants instead of magic strings or byte arrays.
 *
 * Mirrors the on-chain constants declared in:
 *   - `packages/solana/programs/curvy-portal/src/seeds.rs`
 *   - `packages/solana/programs/curvy-portal/src/recovery.rs`
 */

import { type Address, address } from "@solana/kit";
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system";

// ─── PDA Seeds ──────────────────────────────────────────────────────────────
// Solana PDAs are derived from seed bytes + program ID. These are the constant
// string seeds baked into the curvy-portal program (like Solidity's `bytes32`
// constants used in CREATE2 salt computation).

/** PDA seed for the vault account — the Solana counterpart of an EVM portal contract. */
export const PORTAL_SEED = new TextEncoder().encode("portal");

/** PDA seed for the metadata account — per-portal state (is_used, amount, timestamps). */
export const PORTAL_META_SEED = new TextEncoder().encode("portal_meta");

/** PDA seed for the global config account — stores the operator address and pause flag. */
export const CONFIG_SEED = new TextEncoder().encode("config");

/** Domain separator baked into the recovery signature to prevent cross-protocol replay. */
export const RECOVERY_DOMAIN = new TextEncoder().encode("curvy-solana-recovery-v1");

// ─── Well-known program addresses ───────────────────────────────────────────
// On EVM these would be deployed contract addresses. On Solana a "program" is
// a single immutable binary (like a verified contract on Etherscan). Multiple
// "instances" live as PDA accounts under the same program ID.

/** Relay Depository bridge program — the simpler of the two supported bridges. */
export const RELAY_PROGRAM_ID: Address = address("99vQwtBwYtrqqD9YSXbdum3KBdxPAVxYTaQ3cfnJSrN2");

/** Across V4 bridge program — the main production cross-chain bridge. */
export const ACROSS_PROGRAM_ID: Address = address("DLv3NggMiSaef97YCkew5xKUHDh13tVGZ7tydt3ZeAru");

// ─── Token mints ────────────────────────────────────────────────────────────

/**
 * Native SOL sentinel — SPL mints don't exist for native SOL, so we reuse the
 * System Program address (`11111111111111111111111111111111`) to flag "native"
 * in token-address fields. Both the SDK recovery dispatch and the backend
 * currency rows store this exact value, so consumers can compare against it
 * directly.
 *
 * `SYSTEM_PROGRAM_ADDRESS` is already the canonical kit `Address` for this
 * value — no reason to re-encode it from a string literal.
 */
export const NATIVE_SOL_MINT: Address = SYSTEM_PROGRAM_ADDRESS;

/**
 * Wrapped SOL (WSOL) mint — the SPL-token representation of native SOL.
 * EVM equivalent: WETH. Just like ETH must be wrapped to WETH for ERC-20
 * compatibility, SOL must be wrapped to WSOL for SPL token operations.
 * Across requires WSOL for bridging SOL.
 */
export const WSOL_MINT: Address = address("So11111111111111111111111111111111111111112");

// ─── LiFi routing constants ─────────────────────────────────────────────────

export const ARBITRUM_CHAIN_ID = 42161;

/** LiFi uses a non-standard chain ID for Solana (not a real EVM chainId). */
export const LIFI_SOLANA_CHAIN_ID = 1151111081099710;

/** LiFi bridges allowed for Solana -> Arbitrum. Order doesn't imply preference. */
export const ALLOWED_LIFI_BRIDGES = ["across", "relaydepository"] as const;

// ─── Anchor Instruction Discriminators ──────────────────────────────────────
//
// On EVM, function selectors are the first 4 bytes of keccak256("functionName(argTypes)").
// On Solana (Anchor framework), instruction discriminators are the first 8 bytes of
// sha256("global:<instruction_name>"). These are pre-computed from the IDL at
// `packages/solana/target/idl/curvy_portal.json` so the SDK doesn't need to bundle
// the IDL at runtime.

/** Curvy-portal recovery instruction discriminators (match `lib.rs`). */
export const RECOVER_SOL_DISC = Uint8Array.from([196, 48, 160, 233, 7, 0, 200, 22]);
export const RECOVER_SPL_DISC = Uint8Array.from([16, 130, 188, 246, 64, 139, 227, 162]);

/**
 * Curvy-portal bridge instruction discriminators.
 *
 * On-chain the Across variants are named `bridge_sol` / `bridge_spl`. We use
 * `bridgeAcross*` in TypeScript to make the bridge target explicit at call sites.
 */
export const IX_DISC = {
  bridgeRelaySol: Uint8Array.from([2, 219, 43, 205, 143, 113, 250, 251]),
  bridgeRelaySpl: Uint8Array.from([92, 246, 176, 164, 184, 54, 62, 100]),
  bridgeAcrossSol: Uint8Array.from([190, 190, 32, 158, 75, 153, 32, 86]),
  bridgeAcrossSpl: Uint8Array.from([87, 109, 172, 103, 8, 187, 223, 126]),
} as const;

/** Relay Depository `deposit_native` discriminator — used to locate the relay_id inside LiFi's serialized tx. */
export const DEPOSIT_NATIVE_DISC = [13, 158, 13, 223, 95, 213, 28, 6] as const;
