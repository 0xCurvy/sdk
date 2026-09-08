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
/** `ProviderEntry` PDA seed — one entry per allowed LiFi provider program (`set_provider`). */
export const PROVIDER_SEED = new TextEncoder().encode("provider");
/** `FeeConfig` PDA seed — authority-set cap on the operator's in-kind bridge fee (`set_operator_fee_cap`). */
export const FEE_CONFIG_SEED = new TextEncoder().encode("fee_config");

/** Hard ceiling the program accepts for `set_operator_fee_cap` (10% of the input amount). */
export const MAX_OPERATOR_FEE_CAP_BPS = 1_000;

/** Byte size of the one-shot portal meta account (`8 + PortalAccount::INIT_SPACE`) — rent the operator fronts per bridge. */
export const PORTAL_ACCOUNT_SPACE = 123;
/** Byte size of an SPL token account — rent the operator fronts when a route creates one. */
export const TOKEN_ACCOUNT_SPACE = 165;
/** Base fee per signature; the broadcaster signs each bridge transaction once. */
export const LAMPORTS_PER_SIGNATURE = 5_000n;

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

/**
 * Eco Routes intent program used by LiFi for Solana -> EVM SPL-token routes.
 *
 * Eco deployments are immutable, so every Eco fix ships at a NEW address and LiFi
 * follows it. v1 `EcooiHrTiMnfUBMw297gvPwX55HD8SCxA61tBBLV3yaV` was superseded by
 * eco-routes-svm v2.0.0 (Aug 2026, same `fund` ABI).
 *
 * Nothing at runtime pins this value any more: the broadcaster takes the provider
 * program from LiFi's own transaction (located by the `fund` ABI) and the on-chain
 * program checks it against the authority-managed `ProviderEntry` allowlist
 * (`set_provider`). This constant is the CURRENT known address for scripts, tests
 * and the registration runbook.
 */
export const ECO_PROGRAM_ID: Address = address("EcooswwC1NggsckZyF5SeAL9WsgJs3UhPbrqY1apV73F");

/** SPL Token-2022 program used in Eco's fixed `fund` account layout. */
export const TOKEN_2022_PROGRAM_ADDRESS: Address = address("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

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

/**
 * On-chain decimals for Solana SPL tokens whose decimals differ from their
 * canonical (EVM) representation. Keyed by mint/contract address; consumers
 * fall back to the currency's declared decimals when a mint isn't listed.
 */
export const SOLANA_ONCHAIN_DECIMALS: Record<string, number> = {
  // Wormhole-bridged WETH — 8 decimals on Solana vs 18 canonical.
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs": 8,
};

// ─── LiFi routing constants ─────────────────────────────────────────────────

export const ARBITRUM_CHAIN_ID = 42161;

/** LiFi uses a non-standard chain ID for Solana (not a real EVM chainId). */
export const LIFI_SOLANA_CHAIN_ID = 1151111081099710;

/**
 * LiFi bridges that the Curvy program can execute from a PDA.
 *
 * Across remains available through the dedicated Across instruction builders, but
 * LiFi no longer advertises Across as a Solana-origin connector. Do not add a tool
 * here until the on-chain program has a matching, amount-checked CPI integration.
 *
 * The broadcaster first lets LiFi pick among all of these, then falls back to each
 * remaining bridge in this order when the chosen one fails before broadcast (quote,
 * validation or simulation). Relay comes first as the stable fallback: its program
 * is upgradeable, so its address does not rotate the way Eco's does.
 *
 * `near` and `layerswap` are deposit-address bridges: no provider program on Solana,
 * the vault transfers to a one-time address (`bridge_deposit_sol` / `bridge_deposit_spl`).
 * Nothing about them is pinned on-chain, so they survive any provider-side change.
 */
export const ALLOWED_LIFI_BRIDGES = ["relaydepository", "eco", "near", "layerswap"] as const;

/** Bridges in {@link ALLOWED_LIFI_BRIDGES} that LiFi offers only for SPL tokens (no native SOL route, Sep 2026 survey). */
export const LIFI_BRIDGES_WITHOUT_NATIVE_SOL = ["eco", "layerswap"] as const;

/** LiFi tools whose Solana leg is a transfer to a provider deposit address rather than a program CPI. */
export const LIFI_DEPOSIT_ADDRESS_BRIDGES = ["near", "layerswap"] as const;

/** SPL Memo programs (v1 and v2) — deposit-address providers such as Layerswap tag the deposit with a memo. */
export const MEMO_PROGRAM_ADDRESSES: readonly Address[] = [
  address("Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo"),
  address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
];

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
 *
 * `bridge_relay_sol` / `bridge_relay_spl` carry the fee-aware argument list
 * (`relay_amount` + `fee_amounts`) under their original names, so their discriminators
 * are unchanged. Anchor decodes instruction args with borsh `deserialize`, which ignores
 * trailing bytes — a program deployed before that argument change will therefore ACCEPT
 * this payload and mis-read `relay_id`. The Solana program must be upgraded before any
 * service that sends these instructions; see the deploy section of
 * `packages/contracts/solana/README.md`.
 */
export const IX_DISC = {
  bridgeRelaySol: Uint8Array.from([2, 219, 43, 205, 143, 113, 250, 251]),
  bridgeRelaySpl: Uint8Array.from([92, 246, 176, 164, 184, 54, 62, 100]),
  bridgeAcrossSol: Uint8Array.from([190, 190, 32, 158, 75, 153, 32, 86]),
  bridgeAcrossSpl: Uint8Array.from([87, 109, 172, 103, 8, 187, 223, 126]),
  bridgeEcoSpl: Uint8Array.from([80, 79, 216, 219, 154, 122, 7, 131]),
  /** Authority-only: allow / disallow a LiFi provider program (`ProviderEntry` PDA). */
  setProvider: Uint8Array.from([42, 159, 3, 191, 52, 175, 112, 88]),
  /** Deposit-address bridges (LiFi `near`, `layerswap`, …): plain transfer to a one-time address. */
  bridgeDepositSol: Uint8Array.from([130, 110, 110, 203, 156, 14, 180, 208]),
  bridgeDepositSpl: Uint8Array.from([219, 109, 100, 201, 63, 12, 231, 51]),
  /** Authority-only: proportional cap on the operator's in-kind bridge fee (`FeeConfig` PDA). */
  setOperatorFeeCap: Uint8Array.from([239, 26, 192, 45, 45, 52, 172, 8]),
} as const;

/** Relay Depository `deposit_native` discriminator — used to locate the relay_id inside LiFi's serialized tx. */
export const DEPOSIT_NATIVE_DISC = [13, 158, 13, 223, 95, 213, 28, 6] as const;

/** Relay Depository `deposit_token` discriminator — SPL-token counterpart of `deposit_native`. */
export const DEPOSIT_TOKEN_DISC = [11, 156, 96, 218, 39, 163, 180, 19] as const;

/** Eco Routes portal `fund` discriminator. */
export const ECO_FUND_DISC = [218, 188, 111, 221, 152, 113, 174, 7] as const;
