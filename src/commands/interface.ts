import type { Rpc } from "@/rpc/abstract";
import type { CurvySDK } from "@/sdk";
import type { Currency, Network } from "@/types/api";
import type { NetworkFilter } from "@/utils/network";
import type { CurvyWallet } from "@/wallet";
import { HexString } from "@/types/helper";

export abstract class CurvyCommand {
  protected sdk: CurvySDK;

  constructor(sdk: CurvySDK) {
    this.sdk = sdk;
  }

  abstract execute(): Promise<void>;
}

export interface CurvyIntent {
  // TODO: Type as bigint
  // amount: bigint;
  amount: number;
  // TODO: Better type Curvy handle
  toAddress: string | HexString; // if string, then it's curvy handle if it's HexString then it's EOA
  // I don't care that Currency and Network are large objects, intents are rare and always user-generated.
  currency: Currency;
  network: Network;
}

export type CommandEstimateResult = {
  gas: bigint;
  curvyFee: bigint;
  currency: Currency;
};

export abstract class CurvyWalletCommand extends CurvyCommand {
  protected wallet: CurvyWallet;
  protected rpc: Rpc;

  constructor(sdk: CurvySDK, wallet: CurvyWallet, networkFilter: NetworkFilter) {
    super(sdk);
    this.wallet = wallet;
    this.rpc = this.sdk.rpcClient.Network(networkFilter);
  }

  abstract estimate(): Promise<CommandEstimateResult>;
}

export abstract class CurvyComposableCommand extends CurvyCommand {
  protected commands: CurvyCommand[];
  protected ignoreErrors: boolean;

  constructor(sdk: CurvySDK, commands: CurvyCommand[]) {
    super(sdk);
    this.commands = commands;
    this.ignoreErrors = false;
  }

  abstract ignoreErrors(): CurvyComposableCommand {
    this.ignoreErrors = true;
    return this
  }
}

export class CurvyCommander {
  protected sdk: CurvySDK;

  constructor(sdk: CurvySDK) {
    this.sdk = sdk;
  }

  parallel(...commands: CurvyCommand[]) {
    return new CurvyRunInParallelCommand(this.sdk, commands);
  }

  series(...commands: CurvyCommand[]) {
    return new CurvyRunInSeriesCommand(this.sdk, commands)
  }
}
export class CurvyRunInParallelCommand extends CurvyComposableCommand {
  async execute(): Promise<void> {
    await Promise.all(
      this.commands.map(async (command) => {
        try {
          await command.execute();
        } catch (e) {
          console.error(e);
        }
      }),
    );
  }
}

export class CurvyRunInSeriesCommand extends CurvyComposableCommand {
  async execute(): Promise<void> {
    for (const command of this.commands) {
      try {
        await command.execute();
      } catch (e) {
        if (this.ignoreErrors) {
          console.log("I will just log the error");
        } else {
          throw e;
        }
      }
    }
  }
}
