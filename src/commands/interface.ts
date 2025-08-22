// @ts-nocheck

import type { Rpc } from "@/rpc/abstract";
import type { CurvySDK } from "@/sdk";
import type { Currency } from "@/types/api";
import type { HexString } from "@/types/helper";
import type { NetworkFilter } from "@/utils/network";
import type { CurvyWallet } from "@/wallet";

export abstract class CurvyCommand {
  protected sdk: CurvySDK;

  constructor(sdk: CurvySDK) {
    this.sdk = sdk;
  }

  abstract execute(): Promise<void>;
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

export class SendNativeCurrencyCommand extends CurvyWalletCommand {
  #amount: bigint;
  #currency: Currency;
  #to: HexString;

  set amount(value: bigint) {
    this.#amount = value;
  }

  set currency(value: Currency) {
    this.#currency = value;
  }

  set to(value: HexString) {
    this.#to = value;
  }

  async estimate(): Promise<CommandEstimateResult> {
    console.log("I am estimating gas!");

    return <CommandEstimateResult>{
      gas: 0n,
      curvyFee: 0n,
      currency: await this.sdk.getNativeCurrencyForNetwork(this.rpc.network),
    };
  }

  async execute(): Promise<void> {
    console.log(`${this.amount}${this.currency.symbol} sent from ${this.wallet.curvyHandle}!`);
    return Promise.resolve();
  }
}
