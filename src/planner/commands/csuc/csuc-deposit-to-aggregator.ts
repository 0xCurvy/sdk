// TODO: Fix
// @ts-nocheck
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { CSUCCommand } from "@/planner/commands/csuc/abstract";

import {
  createActionExecutionRequest,
  createActionFeeComputationRequest,
  fetchActionExecutionFee,
} from "@/planner/commands/csuc/internal-utils";
import type { CurvyCommandData } from "@/planner/plan";
import { CsucActionSet } from "@/types";

// This command automatically sends all available balance from CSUC to Aggregator
export class CSUCDepositToAggregatorCommand extends CSUCCommand {
  async execute(): Promise<CurvyCommandData> {
    // Total balance available on the address inside CSUC
    const availableBalance: bigint = this.input.balance;

    // Amount that can be moved from CSUC to Aggregator
    const { curvyFee } = await this.estimate();
    const amount: bigint = availableBalance - curvyFee;

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
    const actionRequest = await createActionExecutionRequest(network, this.input, this.actionPayload!, curvyFee);

    // TODO: We don't use the note anywhere, we need to trigger deposit action with the note

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
    this.actionPayload = createActionFeeComputationRequest(
      this.network,
      CsucActionSet.DEPOSIT_TO_AGGREGATOR,
      this.input,
      this.intent.toAddress, //nije dobro
      this.intent.currency.contractAddress as HexString,
      this.intent.amount,
    );

    const estimateResult: CurvyCommandEstimate = {
      gas: 0n, // TODO: Gas
      curvyFee: await fetchActionExecutionFee(this.actionPayload),
    };

    return Promise.resolve(estimateResult);
  }
}
