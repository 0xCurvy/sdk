import type { CurvyIntent, CurvyPlan, CurvyPlanCommand, CurvyPlanFlowControl } from "@/planner/plan";
import { BALANCE_TYPE, type BalanceEntry } from "@/types";
import { isValidCurvyHandle } from "@/types/curvy";
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
      name: "sa-deposit-to-csuc", // This includes gas sponsorship as well.
    });
  }

  // Then addresses can be deposited from CSUC to Aggregator
  if (balanceEntry.type === BALANCE_TYPE.SA || balanceEntry.type === BALANCE_TYPE.CSUC) {
    plan.items.push({
      type: "command",
      name: "csuc-deposit-to-aggregator",
    });
  }

  // ...and if the address is already a note on the aggregator
  // then it's already taken care of by including it in the plan variable
  // at the top of this function.
  return plan;
};

const MAX_INPUT_NOTES_PER_AGGREGATION = 10;

const chunk = (array: Array<any>, chunkSize: number) => {
  const chunks: Array<Array<any>> = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
};

const generateAggregationPlan = (intendedAmount: bigint, items: CurvyPlan[]): CurvyPlanFlowControl => {
  if (items.length <= MAX_INPUT_NOTES_PER_AGGREGATION) {
    return {
      type: "serial",
      items: [
        {
          type: "parallel",
          items,
        },
        {
          type: "command",
          name: "aggregator-aggregate",
        },
      ],
    };
  }

  const chunks = chunk(items, MAX_INPUT_NOTES_PER_AGGREGATION);
  return {
    type: "serial",
    items: [
      {
        type: "parallel",
        items: chunks.map((item) => generateAggregationPlan(intendedAmount, item)),
      },
      {
        type: "command",
        name: "aggregator-aggregate",
      },
    ],
  };
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
  const aggregationPlan = generateAggregationPlan(intent.amount, plansToUpgradeNecessaryAddressesToNotes);

  // The last aggregation needs to be exact as intended
  (aggregationPlan.items![1] as CurvyPlanCommand).amount = intent.amount;

  if (isValidCurvyHandle(intent.toAddress)) {
    // If the intent is to send to the CurvyHandle, then we want to pass the intent to the aggregator-aggregate command as well
    // because the intent will tell that command not to resolve my own CurvyHandle as the recipient,
    // but to send to the end recipient on the aggregator level.
    (aggregationPlan.items![1] as CurvyPlanCommand).intent = intent;
  } else if (isHexString(intent.toAddress)) {
    // If we are sending to EOA, push two more commands
    // to move from Aggregator => CSUC => EOA
    aggregationPlan.items.push(
      {
        type: "command",
        name: "aggregator-withdraw-to-csuc",
      },
      {
        type: "command",
        name: "csuc-withdraw-to-eoa",
        intent,
      },
    );
  } else {
    throw new Error("Intent toAddress must be a CurvyHandle or a HexString");
  }

  return aggregationPlan;
};
