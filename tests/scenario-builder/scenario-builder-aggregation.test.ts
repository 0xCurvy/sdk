import { expect, test } from "vitest";
import { ScenarioBuilder } from "@/scenario-builder";
import { SBState, SBSequence, SBAction, SBParallel } from "@/types/scenario-builder";

const generateDemoState = (): SBState => ({
  notes: [
    {
      owner: { ownerBabyJub: "1", sharedSecretData: { K: "11", V: "12" } },
      amount: 1n,
      token: 1n,
      isSpent: false,
    },
    {
      owner: { ownerBabyJub: "2", sharedSecretData: { K: "21", V: "22" } },
      amount: 2n,
      token: 1n,
      isSpent: false,
    },
  ],
  csucBalances: [
    { address: "0x1", amount: 1n, token: 1n, isSpent: false },
    { address: "0x2", amount: 2n, token: 1n, isSpent: false },
    // { address: "0x3", amount: 3n, token: 1n, isSpent: false },
  ],
  stealthAddressBalances: [
    { address: "0x1", amount: 1n, token: 1n, isSpent: false },
    { address: "0x2", amount: 2n, token: 1n, isSpent: false },
  ],
});

const generateDemoStateAggregatorHeavy = (numSignularNotes: number): SBState => ({
  notes: new Array(numSignularNotes).fill(0).map((_el: number, index: number) => ({
      owner: { ownerBabyJub: `1${index}`, sharedSecretData: { K: `11${index}`, V: `12${index}` } },
      amount: 1n,
      token: 1n,
      isSpent: false,
    })
  ),
  csucBalances: [],
  stealthAddressBalances: [],
});

test("Should skip unnecessary aggregation", async () => {
  const scenarioBuilder = new ScenarioBuilder(generateDemoState());

  const sequence: SBSequence = scenarioBuilder.build(1n, 1n, "0x1", "0x2");
  expect(sequence).toBeDefined();
  expect((sequence.actions[0] as SBAction).shouldSkip).toBe(true);
});

test("Should aggregate two notes into one", async () => {
  const scenarioBuilder = new ScenarioBuilder(generateDemoState());

  const sequence: SBSequence = scenarioBuilder.build(3n, 1n, "0x1", "0x2");

  expect(sequence).toBeDefined();
  expect(sequence.actions.length).toBe(1);

  const action = sequence.actions[0] as SBAction;
  expect(action.shouldSkip).toBe(false);
  expect(action.params.inputNotes.length).toBe(2);
  expect(action.params.outputNotes.length).toBe(2);
  expect(action.params.outputNotes[0].amount).toBe(3n);
  expect(action.params.outputNotes[1].amount).toBe(0n);
});

test("Should deposit two note from CSUC and then aggregate four notes into one", async () => {
  const scenarioBuilder = new ScenarioBuilder(generateDemoState());

  const sequence: SBSequence = scenarioBuilder.build(6n, 1n, "0x2", "0x3");

  expect(sequence).toBeDefined();
  expect(sequence.actions.length).toBe(2);
});

test("Should deposit from two SA to CSUC, then deposit two notes from CSUC to aggregator and then aggregate six notes into one", async () => {
  const scenarioBuilder = new ScenarioBuilder(generateDemoState());

  const sequence: SBSequence = scenarioBuilder.build(9n, 1n, "0x2", "0x3");

  expect(sequence).toBeDefined();
  expect(sequence.actions.length).toBe(3);
});

test("Should create multiple aggregations and end up with one note", async () => {
  const scenarioBuilder = new ScenarioBuilder(generateDemoStateAggregatorHeavy(11));

  const sequence: SBSequence = scenarioBuilder.build(11n, 1n, "0x2", "0x3");

  expect(sequence).toBeDefined();

  const item = sequence.actions[0] as SBParallel;

  expect(sequence.actions.length).toBe(2);

  expect(sequence.actions[0].type).toBe("parallel");
  expect(item.actions.length).toBe(2);
  expect(item.actions[0].type).toBe("action");
  expect(item.actions[1].type).toBe("action");
  expect((item.actions[0] as SBAction).action).toBe("aggregate");
  expect((item.actions[1] as SBAction).action).toBe("aggregate");
});