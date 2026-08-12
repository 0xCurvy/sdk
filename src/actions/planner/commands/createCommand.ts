import { getActiveAccount } from "@/actions/account/getActiveAccount";
import { getActiveKeyPairs } from "@/actions/account/internal/getActiveKeyPairs";
import { signMessageWithBabyJubjub } from "@/actions/account/signMessageWithBabyJubjub";
import { getNetwork } from "@/actions/networks/getNetwork";
import type { CurvyConfig, DirectSubmitter, SubmissionMode } from "@/config/types";
import { CommandError } from "@/errors";
import type { CommandData, CommandKind, Intent } from "@/planner/types";
import { invariant } from "@/utils/invariant";
import { createAggregatorAggregateCommand } from "./createAggregatorAggregateCommand";
import { createAggregatorWithdrawCommand } from "./createAggregatorWithdrawCommand";
import type { Command, CommandContext, CommandEstimate } from "./types";

export type CreateCommandParameters = {
  id: string;
  kind: CommandKind;
  input: CommandData;
  intent?: Intent;
  estimate?: CommandEstimate;
  execution?: unknown;
  submissionMode?: SubmissionMode;
  directSubmitter?: DirectSubmitter;
};

/**
 * Create the command implementation for one typed plan node.
 *
 * @example
 * const command = createCommand(config, { id, kind: "aggregator-aggregate", input });
 *
 * @throws when the kind is unknown, or when `aggregator-withdraw` is missing its intent.
 */
export function createCommand(config: CurvyConfig, params: CreateCommandParameters): Command {
  const {
    id,
    kind,
    input,
    intent,
    estimate,
    execution,
    submissionMode = config.submissionMode,
    directSubmitter,
  } = params;

  invariant(input.length > 0, "A command requires at least one input note.");
  const networkSlug = input[0].networkSlug;

  const ctx: CommandContext = {
    id,
    input,
    intent,
    estimate,
    execution,
    network: getNetwork({ config, filter: networkSlug }),
    networkSlug,
    senderCurvyId: getActiveAccount({ config })?.curvyHandle ?? null,
    // The active account owns the input notes and signs the proof.
    ownerBjjPrivateKeyHex: getActiveKeyPairs(config).s,
    submissionMode,
    directSubmitter,
    config,
    api: config.api,
    core: config.core,
    signMessage: (message) => signMessageWithBabyJubjub({ message, config }),
  };

  switch (kind) {
    case "aggregator-aggregate": {
      // Intent is optional for aggregation (intermediate steps aggregate to self).
      return createAggregatorAggregateCommand(ctx);
    }
    case "aggregator-withdraw": {
      invariant(intent, "Intent is required for aggregator withdraw command.");
      return createAggregatorWithdrawCommand(ctx);
    }
  }

  const unsupported: never = kind;
  throw new CommandError(`Unknown command kind: ${String(unsupported)}`, String(unsupported));
}
