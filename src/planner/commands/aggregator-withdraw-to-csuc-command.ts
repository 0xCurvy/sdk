import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandData } from "@/planner/addresses/abstract";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import { type AggregatorRequestStatusValuesType, BALANCE_TYPE, type CsucBalanceEntry } from "@/types";
import { Note } from "@/types/note";

export class AggregatorWithdrawToCsucCommand extends CurvyCommand {
  sdk: ICurvySDK;
  constructor(input: CurvyCommandData, sdk: ICurvySDK) {
    super(input);
    this.sdk = sdk;
  }

  async execute(): Promise<CurvyCommandData> {
    const vanjin_network = "sepolia";
    const curvyHandle = this.sdk.walletManager.activeWallet.curvyHandle;
    const { address } = await this.sdk.getNewStealthAddressForUser(vanjin_network, curvyHandle);
    const balanceEntries = Array.isArray(this.input) ? this.input : [this.input];

    const allAreNotes = balanceEntries.every((addr) => addr.type === "note");
    if (!allAreNotes) {
      throw new Error("Invalid input for command, aggregator-aggregate command only accepts notes as input.");
    }

    const inputNotesFromCommand: Note[] = balanceEntries.map((noteBalanceEntry) =>
      Note.fromNoteBalanceEntry(noteBalanceEntry),
    );

    const { inputNotes, signatures, destinationAddress } = this.sdk.createWithdrawPayload({
      inputNotes: inputNotesFromCommand,
      destinationAddress: address,
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
    // const destinationCSUCBalanceEntry: CsucBalanceEntry = {
    //   type: BALANCE_TYPE["CSUC"],
    // };

    return Promise.resolve(destinationAddress);
  }

  estimate(): Promise<CurvyCommandEstimate> {
    //@ts-expect-error
    return Promise.resolve(undefined);
  }
}
