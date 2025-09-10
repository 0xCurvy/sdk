import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { CSUCCommand } from "@/planner/commands/csuc/abstract";

import type { CurvyCommandData } from "@/planner/plan";
import { CsucActionSet, CsucActionStage, type HexString } from "@/types";

// This command automatically sends all available balance from CSUC to Aggregator
export class CSUCDepositToAggregatorCommand extends CSUCCommand {
  async execute(): Promise<CurvyCommandData> {
    const currencyAddress = this.input.currencyAddress;

    const note = await this.sdk.getNewNoteForUser(
      this.senderCurvyHandle,
      BigInt(this.input.currencyAddress),
      this.input.balance,
    );

    const { payload, offeredTotalFee } = await this.sdk.estimateActionInsideCSUC(
      this.network.id,
      CsucActionSet.DEPOSIT_TO_AGGREGATOR,
      this.input.source as HexString,
      note.ownerHash,
      currencyAddress as HexString,
      this.input.balance,
    );

    const {
      action: { signature },
      response: { id },
    } = await this.sdk.requestActionInsideCSUC(this.network.id, this.input, payload, offeredTotalFee);

    // TODO: better configure max retries and timeout
    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.csuc.GetActionStatus({ actionIds: [id] }),
      (res) => {
        return res.data[0]?.stage === CsucActionStage.FINALIZED;
      },
      120,
      10000,
    );
  }

  async estimate(): Promise<CurvyCommandEstimate> {}
}
