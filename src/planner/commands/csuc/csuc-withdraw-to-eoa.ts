import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { CSUCCommand } from "@/planner/commands/csuc/abstract";
import {
  createActionExecutionRequest,
  createActionFeeComputationRequest,
  fetchActionExecutionFee,
} from "@/planner/commands/csuc/internal-utils";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import { CsucActionSet, type HexString, isHexString } from "@/types";

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
    const { curvyFee } = await this.estimate();

    // Create the action request ...
    const actionRequest = await createActionExecutionRequest(this.network, this.input, this.actionPayload!, curvyFee);

    // Submit the action request to be later executed on-chain
    // TODO: Validate
    await this.sdk.apiClient.csuc.SubmitActionRequest({
      action: actionRequest,
    });

    // TODO: Check that the result was successful

    // TODO: probably should not return the same input
    return this.input;
  }

  async estimate(): Promise<CurvyCommandEstimate> {
    this.actionPayload = createActionFeeComputationRequest(
      this.network,
      CsucActionSet.WITHDRAW,
      this.input,
      this.#intent.toAddress,
      this.#intent.currency.contractAddress as HexString,
      this.#intent.amount,
    );

    return {
      gas: 0n,
      curvyFee: await fetchActionExecutionFee(this.actionPayload),
    };
  }
}
