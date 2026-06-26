// ─────────────────────────────────────────────────────────────────────────────
// @0xcurvy/curvy-sdk — functional, framework-agnostic core (viem/wagmi-style).
//
// Create a config once, then call standalone actions:
//   const config = await createCurvyConfig({ environment: "mainnet" });
//   await getBalances();                 // uses the ambient config
//   await login({ signature });          // or pass { config } explicitly
//
// Granular, tree-shakeable imports are also available via subpaths:
//   import { poseidonHash } from "@0xcurvy/curvy-sdk/utils";
// ─────────────────────────────────────────────────────────────────────────────

export { CurvyAccount } from "./account";
// Actions — auth, account, balances, planner, recovery, portals, networks, events, storage
export * from "./actions";
// Config + reactive store (createCurvyConfig, destroyConfig, getCurvyConfig, …)
export * from "./config";
export * from "./constants/networks";
export * from "./contracts/evm/abi";
// Live IO objects + their contracts (for advanced / custom configuration)
export { Core } from "./core";
// Errors, network constants, contract ABIs
export * from "./errors";
export { CurvyEventEmitter } from "./events";
export type { IApiClient } from "./interfaces/api";
export type { ICore } from "./interfaces/core";
export type { ICurvyEventEmitter } from "./interfaces/events";
export type { StorageInterface } from "./interfaces/storage";
export * from "./note";
// Planner & shared types
export * from "./planner/types";
export { describePlan } from "./planner/utils/describePlan";
export { EvmRpc, hasBytecode, MultiRpc, newMultiRpc, newRpc, SolanaRpc } from "./rpc";
export type { SolanaSigner } from "./rpc/solana";
export * as solana from "./solana";
export { MapStorage } from "./storage/map-storage";
export * from "./types";
// Pure tiers
export * from "./utils";
