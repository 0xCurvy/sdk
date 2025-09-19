import dayjs from "dayjs";
import { formatEther } from "viem";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { CSUCCommand } from "@/planner/commands/csuc/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import {
  BALANCE_TYPE,
  CsucActionSet,
  CsucActionStage,
  type HexString,
  isHexString,
  type SaBalanceEntry,
} from "@/types";

// This command automatically sends all available balance from CSUC to external address
export class CSUCWithdrawToEOACommand extends CSUCCommand {
  #intent: CurvyIntent;

  constructor(sdk: ICurvySDK, input: CurvyCommandData, intent: CurvyIntent) {
    super(sdk, input);

    if (!isHexString(intent.toAddress)) {
      throw new Error("CSUCWithdrawFromCommand: toAddress MUST be a hex string address");
    }

    this.#intent = intent;
  }

  async execute(): Promise<CurvyCommandData> {
    const currencyAddress = this.input.currencyAddress;

    const { curvyFee, gas } = await this.estimate();

    const { payload } = await this.sdk.estimateActionInsideCSUC(
      this.network.id,
      CsucActionSet.WITHDRAW,
      this.input.source as HexString,
      this.#intent.toAddress as HexString,
      currencyAddress as HexString,
      this.input.balance - gas - curvyFee,
    );

    console.log(gas + curvyFee, formatEther(gas + curvyFee), this.input.balance - gas - curvyFee);

    const {
      response: { id },
    } = await this.sdk.requestActionInsideCSUC(this.input, payload, curvyFee.toString());

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.csuc.GetActionStatus({ actionIds: [id] }),
      (res) => {
        return res.data[0]?.stage === CsucActionStage.FINALIZED;
      },
      120,
      10000,
    );

    return {
      type: BALANCE_TYPE.SA,
      walletId: "PLACEHOLDER", // TODO Remove
      source: this.#intent.toAddress as HexString,
      networkSlug: this.input.networkSlug,
      environment: this.input.environment,
      balance: this.#intent.amount - BigInt(curvyFee),
      symbol: this.input.symbol,
      decimals: this.input.decimals,
      currencyAddress,
      lastUpdated: +dayjs(), // TODO Remove
      createdAt: "PLACEHOLDER", // TODO Remove
    } satisfies SaBalanceEntry;
  }

  async estimate(): Promise<CurvyCommandEstimate> {
    const currencyAddress = this.input.currencyAddress;

    const { offeredTotalFee, gas } = await this.sdk.estimateActionInsideCSUC(
      this.network.id,
      CsucActionSet.WITHDRAW,
      this.input.source as HexString,
      this.#intent.toAddress as HexString,
      currencyAddress as HexString,
      this.input.balance,
    );

    return {
      curvyFee: BigInt(offeredTotalFee),
      gas: BigInt(gas),
    };
  }
}
