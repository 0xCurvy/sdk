import { v4 as uuidV4 } from "uuid";
import type {
  CurvyIntent,
  CurvyPlan,
  CurvyPlanFlowControl,
  GeneratePlanReturnType,
} from "@/planner/plan";
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
      name: "sa-vault-onboard", // This includes gas sponsorship as well.
    });
  }

  // Then addresses can be deposited from CSUC to Aggregator
  if (balanceEntry.type === BALANCE_TYPE.SA || balanceEntry.type === BALANCE_TYPE.Vault) {
    plan.items.push({
      type: "command",
      id: uuidV4(),
      name: "vault-deposit-to-aggregator",
    });
  }

  // ...and if the address is already a note on the aggregator
  // then it's already taken care of by including it in the plan variable
  // at the top of this function.
  return plan;
};

const generateAggregationPlan = (items: CurvyPlan[], intent: CurvyIntent): CurvyPlanFlowControl => {
  const maxInputs = intent.network.aggregationCircuitConfig!.maxInputs;

  // If we have just one sub plan, just aggregate it
  if (items.length === 1) {
    return {
      type: "serial",
      items: [
        items[0],
        {
          type: "command",
            id:uuidV4(),
          name: "aggregator-aggregate",
          intent,
        },
      ],
    };
  }

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

  const aggregationPlan = items[0] as CurvyPlanFlowControl;

  if (aggregationPlan.items.length !== 2) {
    throw new Error("Unexpected number of items in aggregation plan");
  }

  if (aggregationPlan.items[1].type !== "command" || aggregationPlan.items[1].name !== "aggregator-aggregate") {
    throw new Error("Last item in aggregation plan is not an aggregation command");
  }

  // We pass the intent to the last aggregation.
  // The aggregator-aggregate will use the intent's amount as a signal for how much to keep as change
  // And if the `intent.toAddress` is a Curvy handle, it will use it to derive recipients new Note.
  aggregationPlan.items[1].intent = intent;

  return aggregationPlan;
};

export const generatePlan = (balances: BalanceEntry[], intent: CurvyIntent): GeneratePlanReturnType => {
  const plansToUpgradeNecessaryAddressesToNotes: CurvyPlan[] = [];

  let remainingAmount = intent.amount;

  let i = 0;
  for (; i < balances.length; i++) {
    const balanceEntry = balances[i];

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

  const aggregationPlan = generateAggregationPlan(plansToUpgradeNecessaryAddressesToNotes, intent);

  // If we are sending to EOA, push two more commands
  // to move funds from Aggregator to CSUC to EOA
  if (isHexString(intent.toAddress)) {
    aggregationPlan.items.push(
      {
        type: "command",
        id: uuidV4(),
        name: "aggregator-withdraw-to-vault",
      },
      {
        type: "command",
        id: uuidV4(),
        name: "vault-withdraw-to-eoa",
        intent,
      },
    );
  }

  return { plan: aggregationPlan, usedBalances: balances.slice(0, i) };
};
