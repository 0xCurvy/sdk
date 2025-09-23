// @ts-nocheck

// TODO: REIMPLEMENT
import { ethers } from "ethers";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractErc1155Command } from "@/planner/commands/erc1155/abstract";
import type { CurvyCommandData } from "@/planner/plan";

// This command automatically sends all available balance from ERC1155 to Aggregator
export class Erc1155DepositToAggregatorCommand extends AbstractErc1155Command {
  async execute(): Promise<CurvyCommandData> {
    const currencyAddress = this.input.currencyAddress;

    const note = await this.sdk.getNewNoteForUser(this.senderCurvyHandle, BigInt(currencyAddress), this.input.balance);

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

    // Decode the payload to extract the notes
    const encodedData = JSON.parse(payload.encodedData) as any;
    const decodedParams = new ethers.AbiCoder().decode(["tuple(uint256,uint256,uint256)[]"], encodedData.parameters);

    const csucPayloadNotes = (decodedParams[0] as any[]).map((param) => {
      const [ownerHash, token, amount] = param.values();

      return {
        ownerHash: BigInt(ownerHash),
        amount: BigInt(amount),
        token: BigInt(token),
      };
    });

    // Create deposit notes for each of the notes in the CSUC payload
    const depositNotes: Note[] = [];

    for (let i = 0; i < csucPayloadNotes.length; i++) {
      depositNotes.push(note);
    }

    const { erc1155ContractAddress } = this.network;

    if (!erc1155ContractAddress) {
      throw new Error(`CSUC contract address not found for ${this.network.name} network.`);
    }

    const { requestId } = await this.sdk.apiClient.aggregator.SubmitDeposit({
      outputNotes: depositNotes.map((note) => note.serializeDepositNote()),
      csucAddress: erc1155ContractAddress,
      csucTransferAllowanceSignature: signature.hash.toString(),
    });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId),
      (res) => {
        return res.status === "completed";
      },
      120,
      10000,
    );

    // Return the balance entries for each of the deposit notes
    return depositNotes.map((note) =>
      note.toBalanceEntry(
        this.input.symbol,
        this.input.decimals,
        this.input.walletId,
        this.input.environment,
        this.input.networkSlug,
      ),
    );
  }

  async estimate(): Promise<CurvyCommandEstimate> {
    const currencyAddress = this.input.currencyAddress;

    const note = await this.sdk.getNewNoteForUser(this.senderCurvyHandle, BigInt(currencyAddress), this.input.balance);

    const { offeredTotalFee } = await this.sdk.estimateActionInsideCSUC(
      this.network.id,
      CsucActionSet.DEPOSIT_TO_AGGREGATOR,
      this.input.source as HexString,
      note.ownerHash,
      currencyAddress as HexString,
      this.input.balance,
    );

    return { curvyFee: BigInt(offeredTotalFee), gas: 0n }; // TODO what is gas here?
  }
}
