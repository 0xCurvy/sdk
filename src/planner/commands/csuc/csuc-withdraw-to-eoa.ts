import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { CSUCAbstractCommand } from "@/planner/commands/csuc/abstract";
import {
  createActionExecutionRequest,
  createActionFeeComputationRequest,
  fetchActionExecutionFee,
} from "@/planner/commands/csuc/internal-utils";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import { CsucActionSet, isHexString } from "@/types";

// This command automatically sends all available balance from CSUC to external address
export class CSUCWithdrawToEOACommand extends CSUCAbstractCommand {
  protected intent!: CurvyIntent;
  constructor(sdk: ICurvySDK, input: CurvyCommandData, intent: CurvyIntent) {
    super(sdk, input);

    if (!isHexString(intent.toAddress)) {
      throw new Error("CSUCWithdrawFromCommand: toAddress MUST be a hex string address");
    }

    this.intent = intent;
  }

  async execute(): Promise<CurvyCommandData> {
    // Total balance available on the address inside CSUC
    const availableBalance: bigint = this.input.balance;

    // Amount that can be moved from CSUC to external address
    const amountMinusFee: bigint = availableBalance - this.totalFee;

    // TODO: more meaningful handling
    this.input.balance = amountMinusFee;

    // Create the action request ...
    const actionRequest = await createActionExecutionRequest(
      this.intent.network,
      this.input,
      this.actionPayload!, // TODO: Make it not dependent on running estimate first
      this.totalFee,
    );

    // Submit the action request to be later executed on-chain
    const result = await this.sdk.apiClient.csuc.SubmitActionRequest({
      action: actionRequest,
    });

    // TODO: Check that the result was successful

    // TODO: probably should not return the same input
    return this.input;
  }

  async estimate(): Promise<CurvyCommandEstimate> {
    this.actionPayload = createActionFeeComputationRequest(
      this.intent.network,
      CsucActionSet.WITHDRAW,
      this.input,
      this.intent.toAddress,
      this.intent.currency.contractAddress as `0x${string}`,
      this.intent.amount,
    );

    this.totalFee = await fetchActionExecutionFee(this.actionPayload);

    const estimateResult: CurvyCommandEstimate = {
      gas: 100n,
      curvyFee: this.totalFee,
    };

    return Promise.resolve(estimateResult);
  }
}
