import type { ICurvySDK } from "@/interfaces/sdk";

import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import type { CsucBalanceEntry } from "@/types";

import { createActionExecutionRequest } from "@/planner/commands/csuc/internal-utils";

import { CSUCAbstractCommand } from "@/planner/commands/csuc/abstract";

// This command automatically sends all available balance from CSUC to Aggregator
export class CSUCDepositToAggregatorCommand extends CSUCAbstractCommand {
  // constructor(sdk: ICurvySDK, input: CurvyCommandData) {
  //   super(sdk, input);
  //   // this.action = CsucActionSet.DEPOSIT_TO_AGGREGATOR;
  // }

  async execute(): Promise<CurvyCommandData> {
    console.log("Executing: CSUC deposit to aggregator!");

    // Total balance available on the address inside CSUC
    const availableBalance: bigint = this.input.balance;
    // Amount that can be moved from CSUC to Aggregator
    const amount: bigint = availableBalance - this.totalFee;

    // TODO: resolve owner hash based on this.intent.toAddress
    this.sdk.walletManager.activeWallet.curvyHandle;
    // const owner = this.sdk.resolveOwnerFromAddress(this.intent.toAddress);
    // const ownerHash = this.sdk.generateOwnerHash(owner);
    const ownerHash = "not-implemented!";

    // Create the action request ...
    const network = this.sdk.getNetworkBySlug(this.input.networkSlug);
    if (!network) {
      throw new Error(`Network with slug ${this.input.networkSlug} not found!`);
    }
    const actionRequest = await createActionExecutionRequest(network, this.input, this.actionPayload, this.totalFee);

    // Submit the action request to be later executed on-chain
    const result = await this.sdk.apiClient.csuc.SubmitActionRequest({
      action: actionRequest,
    });

    // Artifact that leaves a trace for the next command in the sequence
    const artifact: CurvyCommandAddress = {
      type: "note",
      address: ownerHash,
      currency: this.input.currencyAddress,
      balance: amount,
      sign: async (_message: string): Promise<string> => {
        return "not-implemented!"; // TODO: .sign should be optional?
      },
    };

    return artifact;
  }

  async estimate(): Promise<CurvyCommandEstimate> {
    // this.actionPayload = createActionFeeComputationRequest(
    //   this.intent.network,
    //   this.action,
    //   this.from,
    //   this.to,
    //   this.intent.currency.contractAddress as `0x${string}`,
    //   this.intent.amount,
    // );

    // this.totalFee = await fetchActionExecutionFee(this.actionPayload);
    this.totalFee = 123n;

    const estimateResult: CurvyCommandEstimate = {
      gas: 100n,
      curvyFee: this.totalFee,
    };

    return Promise.resolve(estimateResult);
  }
}
