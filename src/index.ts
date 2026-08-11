// ─────────────────────────────────────────────────────────────────────────────
// @0xcurvy/curvy-sdk — functional, framework-agnostic core (viem/wagmi-style).
//
// Create a config once, then call standalone actions:
//   const config = await createCurvyConfig({ environment: "mainnet" });
//   await getBalances();                 // uses the ambient config
//   await login({ signature });          // or pass { config } explicitly
//
// Specialized protocol tooling lives behind deliberate subpaths:
//   import { poseidonHash } from "@0xcurvy/curvy-sdk/utils";
//   import { Core } from "@0xcurvy/curvy-sdk/core";
// ─────────────────────────────────────────────────────────────────────────────

export { CurvyAccount } from "./account";
// The primary application API.
export * from "./actions";
export * from "./config";
export * from "./constants/networks";
export * from "./errors";
// Contracts used by public config and action extension points.
export type { IApiClient } from "./interfaces/api";
export type { ICore } from "./interfaces/core";
export type { ICurvyEventEmitter } from "./interfaces/events";
export type { StorageInterface } from "./interfaces/storage";
// The protocol note value is part of action inputs/outputs. Note synchronization,
// tree state, and witness helpers remain on the explicit `./note` subpath.
export { Note, type NoteParams } from "./note/note";
export type { BabyJubjubPublicKey, FullNoteData, InputNote, NoteOwner, OutputNote } from "./note/types";
export * from "./planner/types";
export type { SolanaSigner } from "./rpc/solana";
export * as solana from "./solana";
export type * from "./types";
export {
  AGGREGATOR_ACTIONS,
  assertCurvyId,
  assertHexString,
  CURVY_EVENT_TYPES,
  isHexString,
  isValidCurvyId,
  isValidCurvyIdDomain,
} from "./types";
