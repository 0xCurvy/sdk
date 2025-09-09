import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { type AggregatorRequestStatusValuesType, BALANCE_TYPE, type CsucBalanceEntry } from "@/types";
import { Note } from "@/types/note";

export class AggregatorWithdrawToCsucCommand extends CurvyCommand {
  sdk: ICurvySDK;
  constructor(input: CurvyCommandData, sdk: ICurvySDK) {
    super(input);
    this.sdk = sdk;
  }

  async execute(): Promise<CurvyCommandData> {
    const curvyHandle = this.sdk.walletManager.activeWallet.curvyHandle;
    const balanceEntries = Array.isArray(this.input) ? this.input : [this.input];
    const { address } = await this.sdk.getNewStealthAddressForUser(balanceEntries[0].networkSlug, curvyHandle);

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

    const csucNonce = (
      await this.sdk.apiClient.csuc.GetCSAInfo({ network: balanceEntries[0].networkSlug, csas: [destinationAddress] })
    ).data.csaInfo[0].nonce.find(({ token }) => token === balanceEntries[0].currencyAddress)?.value;
    if (!csucNonce) {
      throw new Error(`Can't get nonce for currency ${balanceEntries[0].currencyAddress}`);
    }

    // TODO: Create utility methods for creating balance entries in commands
    const destinationCSUCBalanceEntry: CsucBalanceEntry = {
      type: BALANCE_TYPE.CSUC,
      nonce: BigInt(csucNonce),
      walletId: balanceEntries[0].walletId,
      source: destinationAddress,
      networkSlug: balanceEntries[0].networkSlug,
      environment: balanceEntries[0].environment,
      balance: balanceEntries.reduce((acc, balanceEntry) => acc + BigInt(balanceEntry.balance), 0n),
      symbol: balanceEntries[0].symbol,
      currencyAddress: balanceEntries[0].currencyAddress,
      lastUpdated: balanceEntries[0].lastUpdated,
    };

    return Promise.resolve(destinationCSUCBalanceEntry);
  }

  estimate(): Promise<CurvyCommandEstimate> {
    //@ts-expect-error
    return Promise.resolve(undefined);
  }
}
