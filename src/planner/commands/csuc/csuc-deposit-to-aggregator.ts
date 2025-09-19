import { ethers } from "ethers";
import { formatEther } from "viem";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { CSUCCommand } from "@/planner/commands/csuc/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { CsucActionSet, CsucActionStage, type HexString, type Note } from "@/types";

// This command automatically sends all available balance from CSUC to Aggregator
export class CSUCDepositToAggregatorCommand extends CSUCCommand {
  async execute(): Promise<CurvyCommandData> {
    const currencyAddress = this.input.currencyAddress;

    const note = await this.sdk.getNewNoteForUser(this.senderCurvyHandle, BigInt(currencyAddress), this.input.balance);

    const { curvyFee, gas } = await this.estimate();

    const { payload } = await this.sdk.estimateActionInsideCSUC(
      this.network.id,
      CsucActionSet.DEPOSIT_TO_AGGREGATOR,
      this.input.source as HexString,
      note.ownerHash,
      currencyAddress as HexString,
      this.input.balance - gas - curvyFee,
    );

    console.log(gas + curvyFee, formatEther(gas + curvyFee), this.input.balance - gas - curvyFee);

    const {
      action: { signature },
      response: { id },
    } = await this.sdk.requestActionInsideCSUC(this.input, payload, curvyFee.toString());

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
        amount: BigInt(amount) - curvyFee,
        token: BigInt(token),
      };
    });

    // Create deposit notes for each of the notes in the CSUC payload
    const depositNotes: Note[] = [];

    for (let i = 0; i < csucPayloadNotes.length; i++) {
      depositNotes.push(note);
    }

    const { csucContractAddress } = this.network;

    if (!csucContractAddress) {
      throw new Error(`CSUC contract address not found for ${this.network.name} network.`);
    }

    const { requestId } = await this.sdk.apiClient.aggregator.SubmitDeposit({
      outputNotes: depositNotes.map((note) => note.serializeDepositNote()),
      csucAddress: csucContractAddress,
      csucTransferAllowanceSignature: signature.hash.toString(),
    });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId),
      (res) => {
        return res.status === "success";
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

    const { offeredTotalFee, gas } = await this.sdk.estimateActionInsideCSUC(
      this.network.id,
      CsucActionSet.DEPOSIT_TO_AGGREGATOR,
      this.input.source as HexString,
      0n, // Mock ownerHash value, not used in the estimation
      currencyAddress as HexString,
      this.input.balance,
    );

    return { curvyFee: BigInt(offeredTotalFee), gas: BigInt(gas) };
  }
}
