import type { CurvyCommandAddress } from "@/planner/addresses/abstract";
import type { CurvyCommandCSUCAddress } from "@/planner/addresses/csuc";
import type { CurvyCommandNoteAddress } from "@/planner/addresses/note";
import type { CurvyCommandSAAddress } from "@/planner/addresses/sa";
import type { CurvyIntent, CurvyPlan, CurvyPlanCommand, CurvyPlanFlowControl } from "@/planner/plan";

// Planner balances are already sorted and filtered for Network and Currency
export type PlannerBalances = {
  sa: CurvyCommandSAAddress[];
  csuc: CurvyCommandCSUCAddress[];
  note: CurvyCommandNoteAddress[];
};

const generatePlanToUpgradeAddressToNote = (address: CurvyCommandAddress): CurvyPlan => {
  const plan: CurvyPlan = {
    type: "serial",
    items: [
      {
        type: "data",
        data: address,
      },
    ],
  };

  // Stealth addresses need to be first deposited to CSUC
  if (address.type === "sa") {
    plan.items.push({
      type: "command",
      name: "sa-deposit-to-csuc", // This includes gas sponsorship as well.
    });
  }

  // Then addresses can be deposited from CSUC to Aggregator
  if (address.type === "sa" || address.type === "csuc") {
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

const sortByBalanceDescending = (a: CurvyCommandAddress, b: CurvyCommandAddress): number =>
  a.balance > b.balance ? 1 : -1;

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

export const generatePlan = (balances: PlannerBalances, intent: CurvyIntent): CurvyPlanFlowControl  | undefined => {
  balances.sa = balances.sa.sort(sortByBalanceDescending);
  balances.csuc = balances.csuc.sort(sortByBalanceDescending);
  balances.note = balances.note.sort(sortByBalanceDescending);

  const plansToUpgradeNecessaryAddressesToNotes: CurvyPlan[] = [];

  let remainingAmount = intent.amount;

  for (const address of [...balances.note, ...balances.csuc, ...balances.sa]) {
    if (remainingAmount <= 0n) {
      // Success! We are done with the plan
      break;
    }

    // Deduct the current address balance from the remaining amount
    remainingAmount -= address.balance;

    plansToUpgradeNecessaryAddressesToNotes.push(generatePlanToUpgradeAddressToNote(address));
  }

  if (remainingAmount > 0n) {
    // We weren't successful, there's still some amount remaining.
    return;
  }

  // FUTURE TODO: Skip unnecessary aggregation (if exact amount)
  // FUTURE TODO: Check if we have exact amount on CSUC/SA, and  skip the aggregator altogether

  // TODO: Add exit withdrawal flow to end

  // All we have to do now is batch all the serial plans inside the planLeadingUpToAggregation
  // into aggregator supported batch sizes
  const aggregationPlan = generateAggregationPlan(intent.amount, plansToUpgradeNecessaryAddressesToNotes);

  // The last aggregation needs to be exact as intended
  (aggregationPlan.items![1] as CurvyPlanCommand).amount = intent.amount;

  return aggregationPlan;
};
