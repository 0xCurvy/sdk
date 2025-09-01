import { type CommandEstimateResult, CurvyWalletCommand } from "@/commands/interface";
import type { Currency } from "@/types/api";
import type { HexString } from "@/types/helper";

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
    // TODO: Implement
    console.log(`${this.amount}${this.currency.symbol} sent from ${this.wallet.curvyHandle}!`);
    return Promise.resolve();
  }
}
