import { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { CurvyCommandData, CurvyCommandAddress } from "@/planner/addresses/abstract";

import {
  createActionExecutionRequest,
  createActionFeeComputationRequest,
  fetchActionExecutionFee,
} from "@/planner/commands/csuc/internal-utils";

import { CSUCAbstractCommand } from "@/planner/commands/csuc/abstract";

// This command automatically sends all available balance from CSUC to Aggregator
export class CSUCDepositToAggregatorCommand extends CSUCAbstractCommand {
  constructor(sdk: ICurvySDK, intent: CurvyIntent, input: CurvyCommandData) {
    super(sdk, intent, input, intent.aggregatorAddress);
    this.action = CsucActionSet.DEPOSIT_TO_AGGREGATOR;
  }

  async execute(): Promise<CurvyCommandData> {
    console.log("Executing: CSUC deposit to aggregator!");

    // Total balance available on the address inside CSUC
    const availableBalance: bigint = this.from.balance;
    // Amount that can be moved from CSUC to Aggregator
    const amount: bigint = availableBalance - this.totalFee;

    // TODO: resolve owner hash based on this.intent.toAddress
    // this.intent.toAddress (is .curvy.handle) => pubKey + sharedSecret => ownerHash

    const owner = this.sdk.resolveOwnerFromAddress(this.intent.toAddress);

    const ownerHash = this.sdk.generateOwnerHash(owner);

    // Create the action request ...
    const actionRequest = await createActionExecutionRequest(
      this.intent.network,
      this.from,
      this.actionPayload,
      this.totalFee,
    );

    // Submit the action request to be later executed on-chain
    const result = await this.sdk.apiClient.csuc.SubmitActionRequest({
      action: actionRequest,
    });

    // Artifact that leaves a trace for the next command in the sequence
    const artifact: CurvyCommandAddress = {
      type: "note",
      address: ownerHash,
      currency: this.intent.currency,
      balance: amount,
      sign: async (_message: string): Promise<string> => {
        return "not-implemented!"; // TODO: .sign should be optional?
      },
    };

    return artifact;
  }

  async estimate(): Promise<CurvyCommandEstimate> {
    this.actionPayload = createActionFeeComputationRequest(
      this.intent.network,
      this.action,
      this.from,
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
