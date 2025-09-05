import {
  SBAction,
  SBCsucBalance,
  SBState,
  SBNote,
  SBSequenceItem,
  SBParallel,
} from "@/types/scenario-builder";

type DepositActionParams = {
  recipientBabyJubJubPublicKey: string;
  recipientK: string;
  recipientV: string;
  targetAmount: bigint;
  targetToken: bigint;
};

export class DepositAction {
  private state: SBState;
  private params: DepositActionParams;
  public isExecutable: boolean = false;
  private inputAddresses: SBCsucBalance[] = [];
  private remainingAmount: bigint = 0n;

  constructor(state: SBState, params: DepositActionParams) {
    this.state = state;
    this.params = params;
    this.remainingAmount = params.targetAmount;
  }

  /**
   * Generate new output note as a result of aggregation
   * @param amount
   * @param token
   * @returns
   */
  generateOutputNote(amount: bigint): SBNote {
    return {
      owner: {
        ownerBabyJub: this.params.recipientBabyJubJubPublicKey,
        sharedSecretData: {
          K: this.params.recipientK,
          V: this.params.recipientV,
        },
      },
      amount,
      token: this.params.targetToken,
      isSpent: false,
    };
  }

  /**
   * Generate addresses lookup table based on amounts
   * @returns
   */
  generateAddressAmountsMap() {
    return this.state.csucBalances.reduce(
      (acc: Record<string, SBCsucBalance[]>, address) => {
        if (acc[address.amount.toString()] === undefined) {
          acc[address.amount.toString()] = [];
        }
        acc[address.amount.toString()].push(address);
        return acc;
      },
      {}
    );
  }

  /**
   * Generate actions for deposit
   */
  generateAggregationActions(
    inputAddresses: SBCsucBalance[]
  ): SBSequenceItem[] {
    const actions: SBAction[] = [];
    const outputNotes = inputAddresses.map((address) =>
      this.generateOutputNote(address.amount)
    );

    actions.push({
      type: "action",
      action: "deposit",
      shouldSkip: false,
      params: { inputAddresses, outputNotes },
    });

    outputNotes.forEach((note) => {
      this.state.notes.push(note);
    });

    if (actions.length === 1) {
      return actions;
    }

    const parallelAction: SBParallel = {
      type: "parallel",
      actions,
    };
    return [parallelAction];
  }

  /**
   * Schedule actions for aggregation(s) that result in the generation of the output note with a given amount
   */
  schedule() {
    let remainingAmount = this.remainingAmount;
    const inputAddresses: SBCsucBalance[] = this.inputAddresses;

    const addressAmountsMap = this.generateAddressAmountsMap();

    // Sort notes
    this.state.csucBalances.sort((a, b) => (a.amount > b.amount ? -1 : 1)); // Descending order!

    // Construct a set of addresses that will be used for deposit
    for (const address of this.state.csucBalances) {
      // Skip used notes
      if (address.isSpent) {
        continue;
      }

      // Found note with the exact amount
      const stringifiedAmount = remainingAmount.toString();
      if (addressAmountsMap[stringifiedAmount] != undefined) {
        inputAddresses.push(addressAmountsMap[stringifiedAmount][0]);
        remainingAmount = 0n;

        this.isExecutable = true;
        address.isSpent = true;

        const actions = this.generateAggregationActions(inputAddresses);

        return {
          isExecutable: true,
          actions,
        };
      }

      if (address.amount > remainingAmount) {
        this.isExecutable = true;
        address.isSpent = true;

        const actions = this.generateAggregationActions(inputAddresses);

        return {
          isExecutable: true,
          actions,
        };
      }

      if (address.amount < remainingAmount) {
        remainingAmount -= address.amount;
        inputAddresses.push({ ...address, amount: remainingAmount });
        address.isSpent = true;
      }
    }

    this.inputAddresses = inputAddresses;
    this.remainingAmount = remainingAmount;

    return {
      isExecutable: false,
      remainingAmount,
    };
  }
}
