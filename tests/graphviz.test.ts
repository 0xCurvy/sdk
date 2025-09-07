import { expect, test } from "vitest";
import { planToGraphviz } from "@/planner/graphviz";
import type { CurvyPlan } from "@/planner/plan";

// Example from the issue description
const example: CurvyPlan = {
  type: 'serial',
  items: [
    {
      type: 'serial',
      items: [
        {
          type: 'data',
          // for typing, we can pass any as it's not used in the graphviz label beyond size detection
          // keep it as an array to render as data[2]
          // @ts-ignore
          data: [ {}, {} ]
        },
        { type: 'command', name: 'aggregator-aggregate' }
      ]
    },
    { type: 'command', name: 'aggregator-aggregate', amount: 2n }
  ]
};

test("planToGraphviz produces a DOT graph", () => {
  const dot = planToGraphviz(example, { graphName: 'Example' });
  // Basic expectations
  expect(dot.startsWith('digraph Example {')).toBe(true);
  expect(dot.includes('rankdir=LR')).toBe(true);
  expect(dot.includes('command: aggregator-aggregate')).toBe(true);
  // Ensure amount is shown on the second command
  expect(dot.includes('amount: 2')).toBe(true);
  // Ensure we show data as data[2]
  expect(dot.includes('data[2]')).toBe(true);
});
