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
    const { networkSlug, environment, symbol, lastUpdated, currencyAddress, walletId } = this.input[0];

    const { address: erc1155Address, announcementData } = await this.sdk.getNewStealthAddressForUser(
      networkSlug,
      this.senderCurvyHandle,
    );

    await this.sdk.storage.storeCurvyAddress({
      ...announcementData,
      address: erc1155Address,
      walletId,
      lastScannedAt: { mainnet: 0, testnet: 0 },
    });

    // TODO: Fix this so that we dont have same return values as args
    const { inputNotes, signatures, destinationAddress } = this.sdk.createWithdrawPayload(
      {
        inputNotes: this.inputNotes,
        destinationAddress: erc1155Address,
      },
      this.network,
    );

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
        return res.status === "success";
      },
      120,
      10_000,
    );

    const { balances } = await this.sdk.rpcClient
      .Network(this.input[0].networkSlug)
      .getErc1155Balances(destinationAddress as HexString);
    const erc1155Balance = balances.find((b) => b.currencyAddress === this.input[0].currencyAddress);

    if (!erc1155Balance) {
      throw new Error("Failed to retrieve ERC1155 balance after deposit!");
    }

    // TODO: Create utility methods for creating balance entries in commands
    return {
      type: BALANCE_TYPE.ERC1155,
      walletId: this.input[0].walletId,
      source: destinationAddress as HexString,
      erc1155TokenId: erc1155Balance.erc1155TokenId,
      networkSlug,
      environment,
      balance: erc1155Balance.balance,
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
