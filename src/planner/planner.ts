import { v4 as uuidV4 } from "uuid";
import type { CurvyIntent, CurvyPlan, CurvyPlanCommand, CurvyPlanFlowControl } from "@/planner/plan";
import { BALANCE_TYPE, type BalanceEntry } from "@/types";
import { isHexString } from "@/types/helper";

const generatePlanToUpgradeAddressToNote = (balanceEntry: BalanceEntry): CurvyPlan => {
  const plan: CurvyPlan = {
    type: "serial",
    items: [
      {
        type: "data",
        data: balanceEntry,
      },
    ],
  };

  // Stealth addresses need to be first deposited to CSUC
  if (balanceEntry.type === BALANCE_TYPE.SA) {
    plan.items.push({
      type: "command",
      id: uuidV4(),
      name: "sa-erc1155-onboard", // This includes gas sponsorship as well.
    });
  }

  // Then addresses can be deposited from CSUC to Aggregator
  if (balanceEntry.type === BALANCE_TYPE.SA || balanceEntry.type === BALANCE_TYPE.ERC1155) {
    plan.items.push({
      type: "command",
      id: uuidV4(),
      name: "erc1155-deposit-to-aggregator",
    });
  }

  // ...and if the address is already a note on the aggregator
  // then it's already taken care of by including it in the plan variable
  // at the top of this function.
  return plan;
};

const generateAggregationPlan = (items: CurvyPlan[], maxInputs: number): CurvyPlanFlowControl => {
  while (items.length > 1) {
    const nextLevel = [];

    for (let i = 0; i < items.length; i += maxInputs) {
      const children = items.slice(i, i + maxInputs);
      nextLevel.push({
        type: "serial",
        items: [
          {
            type: "parallel",
            items: children,
          },
          {
            type: "command",
              id: uuidV4(),
            name: "aggregator-aggregate",
          },
        ],
      });
    }

    items = nextLevel as CurvyPlan[]; // Move up one level
  }

  return items[0] as CurvyPlanFlowControl; // Return the root node
};

export const generatePlan = (balances: BalanceEntry[], intent: CurvyIntent): CurvyPlanFlowControl => {
  const plansToUpgradeNecessaryAddressesToNotes: CurvyPlan[] = [];

  let remainingAmount = intent.amount;

  for (const balanceEntry of balances) {
    if (remainingAmount <= 0n) {
      // Success! We are done with the plan
      break;
    }

    // Deduct the current address balance from the remaining amount
    remainingAmount -= balanceEntry.balance;

    plansToUpgradeNecessaryAddressesToNotes.push(generatePlanToUpgradeAddressToNote(balanceEntry));
  }

  if (remainingAmount > 0n) {
    // We weren't successful, there's still some amount remaining.
    throw new Error("Insufficient balance to cover the intended amount");
  }

  // FUTURE TODO: Skip unnecessary aggregation (if exact amount)
  // FUTURE TODO: Check if we have exact amount on CSUC/SA, and  skip the aggregator altogether

  // All we have to do now is batch all the serial plans inside the planLeadingUpToAggregation
  // into aggregator supported batch sizes

  const aggregationPlan = generateAggregationPlan(
    plansToUpgradeNecessaryAddressesToNotes,
    intent.network.aggregationCircuitConfig!.maxInputs,
  );

  // We pass the intent to the last aggregation.
  // The aggregator-aggregate will use the intent's amount as a signal for how much to keep as change
  // And if the `intent.toAddress` is a Curvy handle, it will use it to derive recipients new Note.
  (aggregationPlan.items![1] as CurvyPlanCommand).intent = intent;

  // If we are sending to EOA, push two more commands
  // to move funds from Aggregator to CSUC to EOA
  if (isHexString(intent.toAddress)) {
    aggregationPlan.items.push(
      {
        type: "command",
        id: uuidV4(),
        name: "aggregator-withdraw-to-erc1155",
      },
      {
        type: "command",
        id: uuidV4(),
        name: "erc1155-withdraw-to-eoa",
        intent,
      },
    );
  }

  return aggregationPlan;
};
