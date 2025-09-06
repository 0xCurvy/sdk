// TODO: Suffix all CurvyPlanData/Command/FlowControl with Node

import { CurvyCommandCSUCAddress } from "@/planner/addresses/csuc";
import { CurvyCommandNoteAddress } from "@/planner/addresses/note";
import { CurvyCommandSAAddress } from "@/planner/addresses/sa";
import { CurvyPlan } from "./plan";
import { tryCSUC } from "@/planner/algorithms/csuc";
import { tryNotes } from "@/planner/algorithms/note";
import { trySA } from "@/planner/algorithms/sa";

// Planner balances are already sorted and filtered for Network and Currency
export type PlannerBalances = {
  "sa": CurvyCommandSAAddress[],
  "csuc": CurvyCommandCSUCAddress[],
  "note": CurvyCommandNoteAddress[],
}

// TODO: We should probably create a factory method for returning different addressType variations.
const orderedAddressTypeCallbacks = [tryNotes, tryCSUC, trySA];

export const generatePlan = (inputBalances: PlannerBalances, remainingAmount: bigint, addressTypeIndex = 0): CurvyPlan | undefined => {
  // TODO: We can create a quick optimization to try and sum up the balances first before we try anything.
  const balances: PlannerBalances = {
    sa: [...inputBalances.sa], // TODO: SA
    csuc: [...inputBalances.csuc], // TODO: CSUC
    note: [...inputBalances.note]
  };

  // We have exhausted all options, we cannot aggregate this.
  if (addressTypeIndex >= orderedAddressTypeCallbacks.length) {
    return;
  }


  // We execute the plan for the current address type
  const currentAddressTypeResult = orderedAddressTypeCallbacks[addressTypeIndex](balances, remainingAmount);

  // Valid plan was returned, as it wasn't a bigint signifying how short we fell from gathering the funds on that addressType.
  if (typeof currentAddressTypeResult !== "bigint") {
    return currentAddressTypeResult;
  }

  // If the return type is bigint, we cannot generate a valid plan with the current address type
  // Proceed to trying the next address type
  const nextAddressTypeResult = generatePlan(balances, currentAddressTypeResult, addressTypeIndex + 1);

  // We succeeded the aggregation in the nextAddressType, now retry the current and concat the two
  if (nextAddressTypeResult) {
    const retriedCurrentAddressTypeResult = generatePlan(balances, remainingAmount, addressTypeIndex);

    if (!retriedCurrentAddressTypeResult) {
      throw new Error("This shouldn't happen, all the funds should be here and available");
    }

    return {
      type: "serial",
      items: [
        nextAddressTypeResult,
        retriedCurrentAddressTypeResult
      ]
    };
  }
};