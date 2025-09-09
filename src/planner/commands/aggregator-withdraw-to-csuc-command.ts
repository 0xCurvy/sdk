import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandData } from "@/planner/addresses/abstract";
import type { CurvyCommandNoteAddress } from "@/planner/addresses/note";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { AggregatorRequestStatusValuesType, Note } from "@/types";

export class AggregatorWithdrawToCsucCommand extends CurvyCommand {
  sdk: ICurvySDK;
  constructor(input: CurvyCommandData, sdk: ICurvySDK) {
    super(input);
    this.sdk = sdk;
  }

  async execute(): Promise<CurvyCommandData> {
    const vanjin_network = "sepolia";
    const curveHandle = this.sdk.walletManager.activeWallet.curvyHandle;
    const { address } = await this.sdk.getNewStealthAddressForUser(vanjin_network, curveHandle);
    const inputNote = Array.isArray(this.input) ? this.input : [this.input];
    const noteAddresses = inputNote.filter((addr) => addr.type === "note") as CurvyCommandNoteAddress[];

    const inputNotesFromCommand: Note[] = noteAddresses.map((addr) => addr.note);

    const { inputNotes, signatures, destinationAddress } = this.sdk.createWithdrawPayload({
      inputNotes: inputNotesFromCommand,
      destinationAddress: address,
    });
    const { requestId } = await this.sdk.getApiClient.aggregator.SubmitWithdraw({
      inputNotes,
      signatures,
      destinationAddress,
    });

    await this.sdk.pollForCriteria(
      () => this.sdk.getApiClient.aggregator.GetAggregatorRequestStatus(requestId),
      (res: { status: AggregatorRequestStatusValuesType }) => {
        if (res.status === "failed") {
          throw new Error(`Aggregator withdraw ${res.status}`);
        }
        return res.status === "completed";
      },
      120,
      10_000,
    );
    //@ts-expect-error
    return Promise.resolve(destinationAddress);
  }

  estimate(): Promise<CurvyCommandEstimate> {
    //@ts-expect-error
    return Promise.resolve(undefined);
  }
}
