import { getActiveAccount } from "@/actions/account/getActiveAccount";
import { getActiveKeyPairs } from "@/actions/account/internal/getActiveKeyPairs";
import { signMessageWithBabyJubjub } from "@/actions/account/signMessageWithBabyJubjub";
import { getNetwork } from "@/actions/networks/getNetwork";
import type { CurvyConfig } from "@/config/types";
import type { CommandData, Intent } from "@/planner/types";
import { invariant } from "@/utils/invariant";
import { createAggregatorAggregateCommand } from "./createAggregatorAggregateCommand";
import { createAggregatorWithdrawCommand } from "./createAggregatorWithdrawCommand";
import type { Command, CommandContext, CommandEstimate } from "./types";

export type CreateCommandParameters = {
  id: string;
  name: string;
  input: CommandData;
  intent?: Intent;
  estimate?: CommandEstimate;
};

/**
 * The command registry (the functional replacement for `CurvyCommandFactory`).
 * Resolves the NARROWED {@link CommandContext} from the live `config` — network
 * from the input's `networkSlug`, the active account's handle, the api/core
 * seams, and a BabyJubjub signer bound to the active account — then dispatches
 * to the matching command factory.
 *
 * @example
 * const command = createCommand(config, { id, name: "aggregator-aggregate", input });
 *
 * @throws when the name is unknown, or when `aggregator-withdraw` is missing its intent.
 */
export function createCommand(config: CurvyConfig, params: CreateCommandParameters): Command {
  const { id, name, input, intent, estimate } = params;

  const networkSlug = Array.isArray(input) ? input[0].networkSlug : input.networkSlug;

  const ctx: CommandContext = {
    id,
    input,
    intent,
    estimate,
    network: getNetwork({ config, filter: networkSlug }),
    networkSlug,
    senderCurvyId: getActiveAccount({ config })?.curvyHandle ?? null,
    // The active account owns the input notes and signs the proof (v3 client-proving).
    ownerBjjPrivateKeyHex: getActiveKeyPairs(config).s,
    config,
    api: config.api,
    core: config.core,
    signMessage: (message) => signMessageWithBabyJubjub({ message, config }),
  };

  switch (name) {
    case "aggregator-aggregate": {
      // Intent is optional for aggregation (intermediate steps aggregate to self).
      return createAggregatorAggregateCommand(ctx);
    }
    case "aggregator-withdraw": {
      invariant(intent, "Intent is required for aggregator withdraw command.");
      return createAggregatorWithdrawCommand(ctx);
    }
  }

  throw new Error(`Unknown command name: ${name}`);
}
