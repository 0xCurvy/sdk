import { formatUnits } from "viem";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { SACommand } from "@/planner/commands/sa/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { BALANCE_TYPE, type CsucBalanceEntry, type HexString } from "@/types";

// This command automatically sends all available balance from SA to CSUC address
export class ERC1155OnboardCommand extends SACommand {
  // biome-ignore lint/complexity/noUselessConstructor: Abstract class protected constructor
  constructor(sdk: ICurvySDK, input: CurvyCommandData) {
    super(sdk, input);
  }

  async execute(): Promise<CurvyCommandData> {
    // TODO check why deposit to CSUC fails immediately after wrapNative
    const result = await this.sdk.onboardToCSUC(
      this.input.networkSlug,
      this.input,
      this.input.source as HexString,
      this.input.symbol,
      formatUnits(this.input.balance, this.input.decimals),
    );

    const { createdAt: _, ...inputData } = this.input;

    if (result)
      await this.sdk.pollForCriteria(
        () => this.sdk.apiClient.csuc.GetActionStatus({ actionIds: result.data.actionIds }),
        (res) => res.data[0].stage === "FINALIZED",
        120,
        10_000,
      );

    const {
      data: {
        csaInfo: [{ balances }],
      },
    } = await this.sdk.apiClient.csuc.GetCSAInfo({ network: this.input.networkSlug, csas: [this.input.source] });
    const csucBalance = balances.find((b) => b.token === this.input.currencyAddress);

    if (!csucBalance) {
      throw new Error("Failed to retrieve CSUC balance after deposit");
    }

    return {
      ...inputData,
      balance: BigInt(csucBalance.amount),
      type: BALANCE_TYPE.CSUC,
      nonce: 0n,
    } satisfies CsucBalanceEntry;
  }

  async estimate(): Promise<CurvyCommandEstimate> {
    return { curvyFee: this.input.balance / 1000n, gas: 0n };
  }
}
