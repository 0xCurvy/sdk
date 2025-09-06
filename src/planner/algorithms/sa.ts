import { PlannerBalances } from "@/planner/planner";
import { CurvyPlan } from "@/planner/plan";
import { CurvyCommandSAAddress } from "@/planner/addresses/sa";

export const trySA = (balances: PlannerBalances, remainingAmount: bigint): CurvyPlan | bigint => {
  // Sort from largest to smallest balance
  balances.sa.sort((a, b) => a.balance > b.balance ? 1 : -1);

  let saAddresses: CurvyCommandSAAddress[] = [];
  for (const saAddress of balances.sa) {
    // We are slowly gathering dust
    saAddresses.push(saAddress);
    remainingAmount -= saAddress.balance;

    // We have finally found an address that can fulfill our needs,
    // or simply push us over the edge with the dust collected so far
    if (remainingAmount < 0) {
      return {
        type: "parallel",
        items: saAddresses.map((saAddress) => {
          return {
            type: "serial",
            items: [
              {
                type: "data",
                data: saAddress
              },
              {
                type: "command",
                name: "sa-deposit-to-csuc" // This will also do the gas sponsorship
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
