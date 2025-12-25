import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { EvmRpc } from "@/rpc";
import { BALANCE_TYPE, type SaBalanceEntry } from "@/types";
import type { DeepNonNullable } from "@/types/helper";

export interface ClientCommandEstimate extends CurvyCommandEstimate {
  maxFeePerGas: bigint;
  gasLimit: bigint;
}

export abstract class AbstractClientCommand extends CurvyCommand {
  declare input: DeepNonNullable<SaBalanceEntry>;
  declare estimate: ClientCommandEstimate;
  protected readonly rpc: EvmRpc;

  constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    if (Array.isArray(input)) {
      throw new Error("Invalid input for command, SA commands only accept one data as input.");
    }

    if (input.type !== BALANCE_TYPE.SA) {
      throw new Error("Invalid input for command, SA commands only accept SA balance type as input.");
    }

    if (!input.vaultTokenId) {
      throw new Error("Invalid input for command, vaultTokenId is required.");
    }

    super(id, sdk, input, estimate);

    const rpc = sdk.rpcClient.Network(this.network.id);

    if (!(rpc instanceof EvmRpc)) {
      throw new Error("AbstractMetaTransactionCommand only supports EVM networks.");
    }

    this.rpc = rpc;
  }

  get grossAmount(): bigint {
    return this.input.balance;
  }

  override get recipient() {
    return this.input.source; // For client commands, default recipient is the source of the SA Balance entry
  }
}
