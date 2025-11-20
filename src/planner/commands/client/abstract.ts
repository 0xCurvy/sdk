import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { BALANCE_TYPE, type SaBalanceEntry } from "@/types";
import type { DeepNonNullable } from "@/types/helper";

interface ClientCommandEstimate extends CurvyCommandEstimate {
  maxFeePerGas: bigint;
  gasLimit: bigint;
}

export abstract class AbstractClientCommand extends CurvyCommand {
  declare input: DeepNonNullable<SaBalanceEntry>;

  constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);

    this.validateInput(this.input);
  }

  override get estimateData(): ClientCommandEstimate {
    return super.estimateData as ClientCommandEstimate;
  }

  get grossAmount(): bigint {
    return this.input.balance;
  }

  validateInput(input: CurvyCommandData): asserts input is SaBalanceEntry {
    if (Array.isArray(input)) {
      throw new Error("Invalid input for command, SA commands only accept one data as input.");
    }

    if (input.type !== BALANCE_TYPE.SA) {
      throw new Error("Invalid input for command, SA commands only accept SA balance type as input.");
    }

    if (!input.vaultTokenId) {
      throw new Error("Invalid input for command, vaultTokenId is required.");
    }
  }
}
