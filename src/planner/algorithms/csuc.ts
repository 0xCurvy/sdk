import { PlannerBalances } from "@/planner/planner";
import { CurvyPlan } from "@/planner/plan";
import { CurvyCommandCSUCAddress } from "@/planner/addresses/csuc";

export const tryCSUC = (balances: PlannerBalances, remainingAmount: bigint): CurvyPlan | bigint => {
  // Sort from largest to smallest balance
  balances.csuc.sort((a, b) => a.balance > b.balance ? 1 : -1);

  let csucAddresses: CurvyCommandCSUCAddress[] = [];
  for (const csucAddress of balances.csuc) {
    // We are slowly gathering dust
    csucAddresses.push(csucAddress);
    remainingAmount -= csucAddress.balance;

    // We have finally found an address that can fulfill our needs,
    // or simply push us over the edge with the dust collected so far
    if (remainingAmount < 0) {
      return {
        type: "parallel",
        items: csucAddresses.map((csucAddress) => {
          return {
            type: "serial",
            items: [
              {
                type: "data",
                data: csucAddress
              },
              {
                type: "command",
                name: "csuc-deposit-to-aggregator"
              }
            ]
          };
        })
      };
    }
  }

  // We didn't manage to generate plan, so return just how short we fell from it.
  return remainingAmount;
};
