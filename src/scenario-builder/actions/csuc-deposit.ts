import {
  SBAction,
  SBCsucBalance,
  SBSequenceItem,
  SBState,
  SBStealthAddressBalance,
} from "@/types/scenario-builder";

// TODO: VELIKA GRESKA SE PROVUKLA! CSUC-DEPOSIT JE ZAPRAVO SA NA CSUC A DEPOSIT JE NA AGG

type CsucDepositActionParams = {
  recipientBabyJubJubPublicKey: string;
  recipientK: string;
  recipientV: string;
  targetAmount: bigint;
  targetToken: bigint;
};

export class CsucDepositAction {
  private state: SBState;
  public isExecutable: boolean = false;
  private inputAddresses: SBCsucBalance[] = [];
  private remainingAmount: bigint = 0n;

  constructor(state: SBState, params: CsucDepositActionParams) {
    this.state = state;
    this.remainingAmount = params.targetAmount;
  }

  /**
   * Generate addresses lookup table based on amounts
   * @returns
   */
  generateAddressAmountsMap() {
    return this.state.csucBalances.reduce(
      (acc: Record<string, SBStealthAddressBalance[]>, address) => {
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
  // ova funkcija
  generateAggregationActions(
    inputAddresses: SBCsucBalance[]
  ): SBSequenceItem[] {
    const actions: SBAction[] = [];

    actions.push({
      type: "action",
      action: "csuc-deposit",
      shouldSkip: false,
      params: { inputAddresses },
    });

    inputAddresses.forEach((address) => {
      this.state.csucBalances.push({ ...address, isSpent: false });
    });

    if (actions.length === 1) {
      return actions;
    }

    return [
      {
        type: "parallel",
        shouldSkip: false,
        actions,
      },
    ];
  }

  /**
   * Schedule actions for aggregation(s) that result in the generation of the output note with a given amount
   */
  schedule() {
    let remainingAmount = this.remainingAmount;
    const inputAddresses: SBStealthAddressBalance[] = this.inputAddresses;

    const addressAmountsMap = this.generateAddressAmountsMap();

    // Sort notes
    // sortiramo naopako da uzimamo vece komade da bismo pravili manje noteova
    this.state.stealthAddressBalances.sort((a, b) =>
      a.amount > b.amount ? -1 : 1
    ); // Descending order!

    // Construct a set of addresses that will be used for CSUC deposit
    for (const address of this.state.stealthAddressBalances) {
      // Skip used notes
      if (address.isSpent) {
        continue;
      }

      // Found note with the exact amount
      const stringifiedAmount = remainingAmount.toString();
      if (addressAmountsMap[stringifiedAmount] != undefined) {
        inputAddresses.push(addressAmountsMap[stringifiedAmount][0]);
        remainingAmount = 0n;

        // todo: ovo ti ne treba jer se ne zove rekurzivno, treba samo u returnu
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
        //TODO: OVDE FALI INPUT ADDRESSES PUSH, I FALI TEST ZA TO KAD PREMASUJEMO U CSUC

        const actions = this.generateAggregationActions(inputAddresses);

        return {
          isExecutable: true,
          actions,
        };
      }

      if (address.amount < remainingAmount) {
        remainingAmount -= address.amount;
        inputAddresses.push({ ...address, amount: address.amount });
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
