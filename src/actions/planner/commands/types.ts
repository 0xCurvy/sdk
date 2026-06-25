import type { CurvyConfig } from "@/config/types";
import type { IApiClient } from "@/interfaces/api";
import type { ICore } from "@/interfaces/core";
import type { CommandData, CommandEstimate, Intent } from "@/planner/types";
import type { CurvyId, CurvyPublicKeys, HexString, Network, Signature, StringifyBigInts } from "@/types";

export type { CommandEstimate };

/**
 * The ambient bag a command closure operates on. Resolved by `createCommand`
 * from the live config.
 *
 * The v3 client-proving commands prove locally and relay (see
 * `createAggregatorAggregateCommand` / `createAggregatorWithdrawCommand`), which
 * needs the broader config (prover, relay, storage, synced trees). It is carried
 * here as `config`; the narrowed fields below stay for the estimate path.
 */
export type CommandContext = {
  /** Stable command id (carried through plan estimation/execution). */
  id: string;
  /** The command's input balance entry/entries (from `@/planner/type`). */
  input: CommandData;
  /** The intent driving this command, when present (last aggregation / withdraw). */
  intent?: Intent;
  /** A pre-computed estimate, when re-hydrating an already-estimated command. */
  estimate?: CommandEstimate;
  /** Network resolved from the input's `networkSlug`. */
  network: Network;
  /** The input's network slug (the v3 build/sync actions key off this). */
  networkSlug: string;
  /** Active account's `curvyHandle`, or `null` for ephemeral (STA-claim) accounts. */
  senderCurvyId: CurvyId | null;
  /** The active account's BabyJubjub private key (hex) — owns the input notes, signs the proof. */
  ownerBjjPrivateKeyHex: string;
  /** The live config — the v3 client-proving path needs the prover/relay/storage/sync seams. */
  config: CurvyConfig;
  /** Just the api resources commands use. */
  api: Pick<IApiClient, "user" | "aggregator">;
  /** Just the core methods commands use. */
  core: Pick<ICore, "sendNote">;
  /** Sign a BabyJubjub message, bound to the active account's key. */
  signMessage: (message: bigint) => Promise<StringifyBigInts<Signature>>;
};

/**
 * The closure-based command surface (the faithful functional analog of the
 * legacy `CurvyCommand` class). Built by the `create*Command` factories.
 */
export type Command = {
  readonly id: string;
  readonly name: string;
  readonly recipient: HexString | CurvyId | CurvyPublicKeys;
  readonly grossAmount: bigint;
  estimate?: CommandEstimate;
  estimateFees(): Promise<CommandEstimate>;
  getResultingBalanceEntry(executionData?: unknown): Promise<CommandData | undefined>;
  execute(): Promise<CommandData | undefined>;
};
