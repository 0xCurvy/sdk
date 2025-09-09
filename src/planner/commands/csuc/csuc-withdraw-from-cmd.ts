import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyIntent } from "@/planner/plan";

import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { CsucActionSet, isHexString } from "@/types";

import { CSUCAbstractCommand } from "@/planner/commands/csuc/abstract";

import {
  createActionFeeComputationRequest,
  createActionExecutionRequest,
  fetchActionExecutionFee,
} from "@/planner/commands/csuc/internal-utils";

// This command automatically sends all available balance from CSUC to external address
export class CSUCWithdrawFromCommand extends CSUCAbstractCommand {
  protected intent!: CurvyIntent;
  constructor(sdk: ICurvySDK, input: CurvyCommandData, intent: CurvyIntent) {
    super(sdk, input);

    if (!isHexString(intent.toAddress)) {
      throw new Error("CSUCWithdrawFromCommand: toAddress MUST be a hex string address");
    }

    this.intent = intent;
  }

  async execute(): Promise<CurvyCommandData> {
    console.log("Executing: CSUC withdraw from command!");

    // Total balance available on the address inside CSUC
    const availableBalance: bigint = this.input.balance;
    // Amount that can be moved from CSUC to external address
    const amount: bigint = availableBalance - this.totalFee;

    // TODO: more meaningful handling
    this.input.balance = amount;

    // Create the action request ...
    const actionRequest = await createActionExecutionRequest(
      this.intent.network,
      this.input,
      this.actionPayload,
      this.totalFee,
    );

    // Submit the action request to be later executed on-chain
    const result = await this.sdk.apiClient.csuc.SubmitActionRequest({
      action: actionRequest,
    });

    // TODO: probably should not return the same input
    return this.input;
  }

  async estimate(): Promise<CurvyCommandEstimate> {
    this.actionPayload = createActionFeeComputationRequest(
      this.intent.network,
      CsucActionSet.WITHDRAW,
      this.input,
      this.to,
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
