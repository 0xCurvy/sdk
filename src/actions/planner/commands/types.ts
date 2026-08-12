import type { CurvyConfig, DirectSubmitter, SubmissionMode } from "@/config/types";
import type { CoreAdapter } from "@/core/types";
import type { CurvyApiClient } from "@/http/types";
import type { CommandData, CommandEstimate, CommandKind, Intent, IntentOutput, PlanValue } from "@/planner/types";
import type { CurvyId, CurvyPublicKeys, HexString, Network, Signature, StringifyBigInts } from "@/types";

export type { CommandEstimate };

/**
 * Dependencies and prepared state for one planner command.
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
  /** Opaque state created during estimation and consumed during execution. */
  execution?: unknown;
  /** Network resolved from the input's `networkSlug`. */
  network: Network;
  /** The input's network slug. */
  networkSlug: string;
  /** Active account's `curvyHandle`, or `null` for ephemeral accounts. */
  senderCurvyId: CurvyId | null;
  /** The active account's BabyJubjub private key (hex) — owns the input notes, signs the proof. */
  ownerBjjPrivateKeyHex: string;
  /** Submission path selected when this plan was estimated. */
  submissionMode: SubmissionMode;
  /** Direct signer adapter, resolved at execution time. */
  directSubmitter?: DirectSubmitter;
  /** Live SDK dependencies used for proving, relay, storage, and sync. */
  config: CurvyConfig;
  /** Just the api resources commands use. */
  api: Pick<CurvyApiClient, "user">;
  /** Just the core methods commands use. */
  core: Pick<CoreAdapter, "sendNote">;
  /** Sign a BabyJubjub message, bound to the active account's key. */
  signMessage: (message: bigint) => Promise<StringifyBigInts<Signature>>;
};

/**
 * Internal command contract shared by estimation and execution.
 */
export type Command = {
  readonly id: string;
  readonly kind: CommandKind;
  readonly recipient: HexString | CurvyId | CurvyPublicKeys;
  readonly grossAmount: bigint;
  estimate?: CommandEstimate;
  estimateFees(): Promise<CommandEstimate>;
  getResultingData(): Promise<PlanValue | undefined>;
  getExecutionData(): unknown;
  getIntentOutput(): IntentOutput | undefined;
  execute(): Promise<PlanValue | undefined>;
};
