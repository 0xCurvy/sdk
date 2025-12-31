import { v4 as uuidV4 } from "uuid";
import type { CurvyIntent, CurvyPlan, CurvyPlanFlowControl, GeneratePlanReturnType } from "@/planner/plan";
import { BALANCE_TYPE, type BalanceEntry } from "@/types";
import { isHexString } from "@/types/helper";
import { NATIVE_CURRENCY_ADDRESS } from "@/utils";

const generatePlanToUpgradeAddressToNote = (balanceEntry: BalanceEntry): CurvyPlan => {
  // If is note, just return it
  if (balanceEntry.type === BALANCE_TYPE.NOTE) {
    return {
      type: "data",
      data: balanceEntry,
    };
  }

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
      name: balanceEntry.currencyAddress === NATIVE_CURRENCY_ADDRESS ? "vault-onboard-native" : "vault-onboard-erc20", // This includes gas sponsorship as well.
    });
  }

  // Then addresses can be deposited from CSUC to Aggregator
  if (balanceEntry.type === BALANCE_TYPE.SA || balanceEntry.type === BALANCE_TYPE.VAULT) {
    plan.items.push({
      type: "command",
      id: uuidV4(),
      name: "vault-deposit-to-aggregator",
    });
  }

  return plan;
};

const generateAggregationPlan = (items: CurvyPlan[], intent: CurvyIntent): CurvyPlan => {
  const maxInputs = intent.network.aggregationCircuitConfig!.maxInputs;

  // If we have just one sub plan, just aggregate it
  if (items.length === 1) {
    return {
      type: "serial",
      items: [
        items[0],
        {
          type: "command",
          id: uuidV4(),
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

      const nextLevelItems: CurvyPlan[] = [];

      if (children.length === 1) {
        nextLevelItems.push(children[0]);
      } else {
        nextLevelItems.push(
          {
            type: "parallel",
            items: children,
          },
          {
            type: "command",
            id: uuidV4(),
            name: "aggregator-aggregate",
          },
        );
      }

      nextLevel.push({
        type: "serial",
        items: nextLevelItems,
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

  let plan: CurvyPlan;
  const aggregationPlan = generateAggregationPlan(plansToUpgradeNecessaryAddressesToNotes, intent);

  // If we are sending to EOA, push two more commands
  // to move funds from Aggregator to CSUC to EOA
  if (isHexString(intent.recipient)) {
    plan = {
      type: "serial",
      items: [
        aggregationPlan,
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
      ],
    };

    if (intent.exitNetwork) {
      plan.items.push({
        type: "command",
        id: uuidV4(),
        name: intent.currency.nativeCurrency ? "exit-bridge-native" : "exit-bridge",
        intent,
      });
    }
  } else {
    plan = aggregationPlan;
  }

  return { plan, usedBalances: balances.slice(0, i) };
};
