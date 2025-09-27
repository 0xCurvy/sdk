import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AggregatorCommand } from "@/planner/commands/aggregator/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import {
  type AggregatorRequestStatusValuesType,
  BALANCE_TYPE,
  type Erc1155BalanceEntry,
  type HexString,
} from "@/types";

export class AggregatorWithdrawToErc1155Command extends AggregatorCommand {
  async execute(): Promise<CurvyCommandData> {
    const { networkSlug, environment, symbol, lastUpdated, currencyAddress } = this.input[0];

    const { address: csucAddress } = await this.sdk.getNewStealthAddressForUser(networkSlug, this.senderCurvyHandle);

    // TODO: Fix this so that we dont have same return values as args
    const { inputNotes, signatures, destinationAddress } = this.sdk.createWithdrawPayload({
      inputNotes: this.inputNotes,
      destinationAddress: csucAddress,
    });

    const { requestId } = await this.sdk.apiClient.aggregator.SubmitWithdraw({
      inputNotes,
      signatures,
      destinationAddress,
    });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId),
      (res: { status: AggregatorRequestStatusValuesType }) => {
        if (res.status === "failed") {
          throw new Error(`Aggregator withdraw ${res.status}`);
        }
        return res.status === "completed";
      },
      120,
      10_000,
    );

    // TODO: Create utility methods for creating balance entries in commands
    return {
      type: BALANCE_TYPE.ERC1155,
      // walletId,
      source: destinationAddress as HexString,
      networkSlug,
      environment,
      balance: this.inputNotesSum,
      symbol,
      decimals: this.input[0].decimals,
      currencyAddress,
      lastUpdated,
    } satisfies Erc1155BalanceEntry;
  }

  // In the case of aggregator-withdraw-to-csuc command, both the circuit
  // and the aggregator SC have withdrawBPS set, circuits calculate what is the
  // feeAmount and pass it to CSUC so that CSUC can put it on th fee collector
  async estimate(): Promise<CurvyCommandEstimate> {
    return {
      curvyFee: this.inputNotesSum / 500n, // 0.2% = 1/500
      gas: 0n,
    };
  }
}
