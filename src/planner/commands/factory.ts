import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommand, CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AggregatorAggregateCommand } from "@/planner/commands/aggregator/aggregator-aggregate";
import { AggregatorWithdrawToVaultCommand } from "@/planner/commands/aggregator/aggregator-withdraw-to-vault";
import { VaultOnboardNativeCommand } from "@/planner/commands/client/vault-onboard-native-command";
import { ExitBridgeCommand } from "@/planner/commands/meta-transaction/exit-bridge-command";
import { VaultDepositToAggregatorCommand } from "@/planner/commands/meta-transaction/vault-deposit-to-aggregator";
import { VaultOnboardCommand } from "@/planner/commands/meta-transaction/vault-onboard-command";
import { VaultWithdrawToEOACommand } from "@/planner/commands/meta-transaction/vault-withdraw-to-eoa";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";

export interface ICommandFactory {
  createCommand(
    id: string,
    name: string,
    input: CurvyCommandData,
    intent?: CurvyIntent,
    estimate?: CurvyCommandEstimate,
  ): CurvyCommand;
}

export class CurvyCommandFactory implements ICommandFactory {
  #sdk: ICurvySDK;

  constructor(sdk: ICurvySDK) {
    this.#sdk = sdk;
  }

  // TODO: Think about moving checks from constructors here, and just adjusting the map of commands for mocks so that we can still test constraints
  createCommand(
    id: string,
    name: string,
    input: CurvyCommandData,
    intent?: CurvyIntent,
    estimate?: CurvyCommandEstimate,
  ): CurvyCommand {
    switch (name) {
      case "vault-onboard-erc20": // This is with gas sponsorship as well
        return new VaultOnboardCommand(id, this.#sdk, input, estimate);
      case "vault-onboard-native":
        return new VaultOnboardNativeCommand(id, this.#sdk, input, estimate);
      case "vault-deposit-to-aggregator":
        return new VaultDepositToAggregatorCommand(id, this.#sdk, input, estimate);
      case "vault-withdraw-to-eoa": {
        return new VaultWithdrawToEOACommand(id, this.#sdk, input, intent, estimate);
      }
      case "aggregator-aggregate": {
        return new AggregatorAggregateCommand(id, this.#sdk, input, intent, estimate);
      }
      case "aggregator-withdraw-to-vault":
        return new AggregatorWithdrawToVaultCommand(id, this.#sdk, input, estimate);
      case "exit-bridge":
        if (!intent) {
          throw new Error(`${name} requires an intent`);
        }
        return new ExitBridgeCommand(id, this.#sdk, input, intent, estimate);
    }

    throw new Error(`Unknown command name: ${name}`);
  }
}
