import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { CSUCAbstractCommand } from "@/planner/commands/csuc/abstract";

import { createActionExecutionRequest } from "@/planner/commands/csuc/internal-utils";
import type { CurvyCommandData } from "@/planner/plan";

// This command automatically sends all available balance from CSUC to Aggregator
export class CSUCDepositToAggregatorCommand extends CSUCAbstractCommand {
  async execute(): Promise<CurvyCommandData> {
    // Total balance available on the address inside CSUC
    const availableBalance: bigint = this.input.balance;
    // Amount that can be moved from CSUC to Aggregator
    const amount: bigint = availableBalance - this.totalFee;

    // Resolve owner hash based on .curvy.handle
    const note = await this.sdk.getNewNoteForUser(
      this.sdk.walletManager.activeWallet.curvyHandle,
      BigInt(this.input.currencyAddress),
      amount,
    );

    // Create the action request ...
    const network = this.sdk.getNetworkBySlug(this.input.networkSlug);
    if (!network) {
      throw new Error(`Network with slug ${this.input.networkSlug} not found!`);
    }
    // TODO: Don't tie in estimation to execution
    const actionRequest = await createActionExecutionRequest(network, this.input, this.actionPayload!, this.totalFee);

    // Submit the action request to be later executed on-chain
    await this.sdk.apiClient.csuc.SubmitActionRequest({
      // TODO: Validate
      action: actionRequest,
    });

    return note.serializeNoteToBalanceEntry(
      this.input.symbol,
      this.input.walletId,
      this.input.environment,
      this.input.networkSlug,
    );
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
    this.totalFee = 0n;

    const estimateResult: CurvyCommandEstimate = {
      gas: 100n,
      curvyFee: this.totalFee,
    };

    return Promise.resolve(estimateResult);
  }
}
