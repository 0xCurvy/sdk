import { CurvyPlan } from "@/planner/plan";
import { CurvyCommandNoteAddress } from "@/planner/addresses/note";
import { PlannerBalances } from "@/planner/planner";

// TODO: Move to config in the future
const MAX_INPUT_NOTES_PER_AGGREGATION = 10;

const chunk = (array: Array<any>, chunkSize: number) => {
  const chunks: Array<Array<any>> = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
};

const generateAggregationPlan = (inputs: CurvyCommandNoteAddress[] | CurvyPlan[]): CurvyPlan => {
  // We need to go deeper
  if (inputs.length > MAX_INPUT_NOTES_PER_AGGREGATION) {
    const chunks = chunk(inputs, MAX_INPUT_NOTES_PER_AGGREGATION);

    return {
      type: "serial",
      items: [
        {
          type: "parallel",
          items: chunks.map((item) => generateAggregationPlan(item as CurvyCommandNoteAddress[] | CurvyPlan[]))
        }
      ]
    };
  }

  if (inputs[0].type === "note") { // We are dealing with notes
    return {
      type: "serial",
      items: [
        {
          type: "data",
          data: inputs as CurvyCommandNoteAddress[]
        },
        {
          type: "command",
          name: "aggregator-aggregate"
        }
      ]
    };
  } else { // we are dealing with ControlFlow
    return {
      type: "parallel",
      items: [
        ...inputs as CurvyPlan[],
        {
          type: "command",
          name: "aggregator-aggregate"
        }
      ]
    };
  }
};
export const tryNotes = (balances: PlannerBalances, remainingAmount: bigint): CurvyPlan | bigint => {
  // Sort from largest to smallest balance
  balances.note.sort((a, b) => a.balance > b.balance ? 1 : -1);

  let inputNotes: CurvyCommandNoteAddress[] = [];
  for (const note of balances.note) {
    // We are slowly gathering dust
    inputNotes.push(note);
    remainingAmount -= note.balance;

    // We have finally found a note that can fulfill our needs,
    // or simply push us over the edge with the dust collected so far
    if (remainingAmount < 0) {
      return {
        type: "serial",
        items: [
          generateAggregationPlan(inputNotes),
          {
            // `amount` indicates how much to leave as change
            // aggregator-aggregate command will create second output as dummy if `amount` is zero
            type: "command",
            name: "aggregator-aggregate",
            amount: -remainingAmount // `-` prefix for abs because we know its negative
          }
        ]
      };
    }
  }

  // We didn't manage to generate plan, so return just how short we fell from it.
  return remainingAmount;
};
