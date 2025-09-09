import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyIntent } from "@/planner/plan";

import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import type { CsucBalanceEntry } from "@/types";

import { CSUCAbstractCommand } from "@/planner/commands/csuc/abstract";

// This command automatically sends all available balance from CSUC to external address
export class CSUCWithdrawFromCommand extends CSUCAbstractCommand {
  protected intent!: CurvyIntent;
  constructor(sdk: ICurvySDK, input: CurvyCommandData, intent: CurvyIntent) {
    super(sdk, input);

    this.intent = intent;
  }

  // @ts-ignore
  async execute(): Promise<CurvyCommandData> {
    // console.log("Executing: CSUC withdraw from command!");
    // // Total balance available on the address inside CSUC
    // const availableBalance: bigint = this.from.balance;
    // // Amount that can be moved from CSUC to external address
    // const amount: bigint = availableBalance - this.totalFee;
    // const { address: resolvedExternalAddress } = await this.sdk.getNewStealthAddressForUser(
    //   this.intent.network.chainId,
    //   this.intent.toAddress, // Assumes this is a .curvy.handle
    // );
    // Create the action request ...
    // const actionRequest = await createActionExecutionRequest(
    //   this.intent.network,
    //   this.from,
    //   this.actionPayload,
    //   this.totalFee,
    // );
    // Submit the action request to be later executed on-chain
    // const result = await this.sdk.apiClient.csuc.SubmitActionRequest({
    //   action: actionRequest,
    // });
    // // Artifact that leaves a trace for the next command in the sequence
    // const artifact: CurvyCommandAddress = {
    //   type: "sa",
    //   address: resolvedExternalAddress,
    //   currency: this.intent.currency,
    //   balance: amount,
    //   sign: async (_message: string): Promise<string> => {
    //     return "not-implemented!"; // TODO: .sign should be optional?
    //   },
    // };
    // return artifact;
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
