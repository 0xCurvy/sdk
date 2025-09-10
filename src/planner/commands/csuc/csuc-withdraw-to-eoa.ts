import dayjs from "dayjs";
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

    const { payload, offeredTotalFee } = await this.sdk.estimateActionInsideCSUC(
      this.network.id,
      CsucActionSet.WITHDRAW,
      this.input.source as HexString,
      this.#intent.toAddress as HexString,
      currencyAddress as HexString,
      this.input.balance,
    );

    const {
      response: { id },
    } = await this.sdk.requestActionInsideCSUC(this.network.id, this.input, payload, offeredTotalFee);

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
      source: this.#intent.toAddress,
      networkSlug: this.input.networkSlug,
      environment: this.input.environment,
      balance: this.#intent.amount - BigInt(offeredTotalFee),
      symbol: this.input.symbol,
      currencyAddress,
      lastUpdated: +dayjs(), // TODO Remove
      createdAt: "PLACEHOLDER", // TODO Remove
    } satisfies SaBalanceEntry;
  }

  async estimate(): Promise<CurvyCommandEstimate> {
    const currencyAddress = this.input.currencyAddress;

    const { offeredTotalFee } = await this.sdk.estimateActionInsideCSUC(
      this.network.id,
      CsucActionSet.WITHDRAW,
      this.input.source as HexString,
      this.#intent.toAddress as HexString,
      currencyAddress as HexString,
      this.input.balance,
    );

    return {
      curvyFee: BigInt(offeredTotalFee),
      gas: 0n,
    };
  }
}
