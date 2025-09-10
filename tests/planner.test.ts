//@ts-nocheck
// TODO: Fix these tests for planner balances
import { NETWORK_FLAVOUR, NETWORK_GROUP } from "@/constants/networks";
import type { CurvyIntent } from "@/planner/plan";
import { generatePlan } from "@/planner/planner";
import type { CsucBalanceEntry, Currency, Network, NoteBalanceEntry, SaBalanceEntry } from "@/types";

const mockCurrency: Currency = {
  id: 0,
  name: "mock",
  symbol: "",
  coinmarketcapId: "",
  iconUrl: "",
  price: "",
  updatedAt: "",
  decimals: 0,
  contractAddress: "",
  nativeCurrency: false,
  csucEnabled: false,
};
const mockNetwork: Network = {
  id: 1,
  name: "Mock Network",
  group: NETWORK_GROUP.ETHEREUM,
  testnet: true,
  slip0044: 1,
  flavour: NETWORK_FLAVOUR.EVM,
  multiCallContractAddress: "0x0000000000000000000000000000000000000000",
  csucContractAddress: "0x0000000000000000000000000000000000000001",
  aggregatorContractAddress: "0x0000000000000000000000000000000000000002",
  nativeCurrency: "MockToken",
  chainId: "0x1",
  blockExplorerUrl: "https://mockexplorer.com",
  rpcUrl: "https://mock-rpc-url.com",
  currencies: [mockCurrency],
};

const generateMockSABalances = (...balances: bigint[]): SaBalanceEntry[] => {
  return balances.map((balance) => {
    return {
      source: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      currencyAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      networkSlug: "ethereum-sepolia",
      type: "sa",
      symbol: "ETH",
      balance,
      environment: "testnet",
      createdAt: Date.now().toString(),
      walletId: "mock-wallet-id",
      lastUpdated: Date.now(),
    };
  });
};

const generateMockCSUCBalances = (...balances: bigint[]): CsucBalanceEntry[] => {
  return balances.map((balance) => {
    return {
      source: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      currencyAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      networkSlug: "ethereum-sepolia",
      type: "csuc",
      symbol: "ETH",
      balance,
      nonce: 0n,
      environment: "testnet",
      createdAt: Date.now().toString(),
      walletId: "mock-wallet-id",
      lastUpdated: Date.now(),
    };
  });
};

const generateMockNoteBalances = (...balances: bigint[]): NoteBalanceEntry[] => {
  return balances.map((balance) => {
    return {
      source: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      currencyAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      networkSlug: "ethereum-sepolia",
      type: "note",
      symbol: "ETH",
      balance,
      environment: "testnet",
      createdAt: Date.now().toString(),
      walletId: "mock-wallet-id",
      lastUpdated: Date.now(),
      deliveryTag: {
        viewTag: 0n,
        ephemeralKey: 0n,
      },
      owner: {
        babyJubjubPublicKey: {
          x: 0n,
          y: 0n,
        },
        sharedSecret: 0n,
      },
    };
  });
};

// TODO: Intents where I want to send to curvy handle vs EOA
const generateMockIntent = (amount: bigint): CurvyIntent => {
  return {
    amount,
    toAddress: "0xwhat",
    currency: mockCurrency,
    network: mockNetwork,
  };
};

const exampleBalances: PlannerBalances = {
  sa: generateMockSABalances(1n, 2n),
  csuc: generateMockCSUCBalances(1n, 2n),
  note: generateMockNoteBalances(1n, 2n),
};

const exampleBalancesAggregatorHeavy: PlannerBalances = {
  sa: [],
  csuc: [],
  note: generateMockNoteBalances(1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n),
};

const exampleBalancesAggregatorHeavy2: PlannerBalances = {
  sa: [],
  csuc: [],
  note: generateMockNoteBalances(6n, 6n),
};

const exampleBalancesSAHeavy2: PlannerBalances = {
  sa: generateMockSABalances(5n, 5n),
  csuc: [],
  note: [],
};

const exampleEmptySAHeavy2: PlannerBalances = {
  sa: [],
  csuc: [],
  note: [],
};

test("should generate something", () => {
  const intent: CurvyIntent = generateMockIntent(1n);

  const topLevelAggregation = generatePlan(exampleBalances, intent) as any;
  expect(topLevelAggregation).toBeDefined();

  expect(topLevelAggregation.type).toBe("serial");
  expect(topLevelAggregation.items.length).toBe(2);

  const topLevelAggregationInputs = topLevelAggregation.items[0];
  const topLevelAggregationCommand = topLevelAggregation.items[1];

  expect(topLevelAggregationInputs.type).toBe("parallel");
  expect(topLevelAggregationInputs.items.length).toBe(1);

  expect(topLevelAggregationCommand.type).toBe("command");
  expect(topLevelAggregationCommand.amount).toBe(1n);

  console.dir(topLevelAggregation, { depth: null });
});

test("simple, but go through all three levels", () => {
  const intent: CurvyIntent = generateMockIntent(8n);

  const topLevelAggregation = generatePlan(exampleBalances, intent) as any;
  expect(topLevelAggregation).toBeDefined();

  expect(topLevelAggregation.items.length).toBe(2);

  const topLevelAggregationInputs = topLevelAggregation.items[0];
  const topLevelAggregationCommand = topLevelAggregation.items[1];

  expect(topLevelAggregationInputs.type).toBe("parallel");

  // Use 2 existing notes, deposit 4 more from SA to SCUC to Aggregator
  expect(topLevelAggregationInputs.items.length).toBe(6);

  expect(topLevelAggregationCommand.type).toBe("command");
  expect(topLevelAggregationCommand.amount).toBe(8n);

  for (const item of topLevelAggregationInputs.items) {
    expect(item.type).toBe("serial");
    expect(item.items.length).toBeGreaterThanOrEqual(0);
  }

  const [existingNote1, existingNote2, newNote3, newNote4, newNote5, newNote6] = topLevelAggregationInputs.items;

  expect(existingNote1.type).toBe("serial");
  expect(existingNote1.items.length).toBe(1);
  expect(existingNote1.items[0].type).toBe("data");

  expect(existingNote2.type).toBe("serial");
  expect(existingNote2.items.length).toBe(1);
  expect(existingNote2.items[0].type).toBe("data");

  expect(newNote3.type).toBe("serial");
  expect(newNote3.items.length).toBe(3); // data, deposit to CSUC, deposit to Aggregator
  expect(newNote3.items[0].type).toBe("data");
  expect(newNote3.items[1].type).toBe("command");
  expect(newNote3.items[1].name).toBe("sa-deposit-to-csuc");
  expect(newNote3.items[2].type).toBe("command");
  expect(newNote3.items[2].name).toBe("csuc-deposit-to-aggregator");

  expect(newNote4.type).toBe("serial");
  expect(newNote4.items.length).toBe(3); // data, deposit to CSUC, deposit to Aggregator
  expect(newNote4.items[0].type).toBe("data");
  expect(newNote4.items[1].type).toBe("command");
  expect(newNote4.items[1].name).toBe("sa-deposit-to-csuc");
  expect(newNote4.items[2].type).toBe("command");
  expect(newNote4.items[2].name).toBe("csuc-deposit-to-aggregator");

  expect(newNote5.type).toBe("serial");
  expect(newNote5.items.length).toBe(3); // data, deposit to CSUC, deposit to Aggregator
  expect(newNote5.items[0].type).toBe("data");
  expect(newNote5.items[1].type).toBe("command");
  expect(newNote5.items[1].name).toBe("sa-deposit-to-csuc");
  expect(newNote5.items[2].type).toBe("command");
  expect(newNote5.items[2].name).toBe("csuc-deposit-to-aggregator");

  expect(newNote6.type).toBe("serial");
  expect(newNote6.items.length).toBe(3); // data, deposit to CSUC, deposit to Aggregator
  expect(newNote6.items[0].type).toBe("data");
  expect(newNote6.items[1].type).toBe("command");
  expect(newNote6.items[1].name).toBe("sa-deposit-to-csuc");
  expect(newNote6.items[2].type).toBe("command");
  expect(newNote6.items[2].name).toBe("csuc-deposit-to-aggregator");

  expect(topLevelAggregation).toBeDefined();

  console.dir(topLevelAggregation, { depth: null });
});

test("should create multiple aggregations", () => {
  const intent: CurvyIntent = generateMockIntent(11n);

  const topLevelAggregation = generatePlan(exampleBalancesAggregatorHeavy, intent) as any;
  expect(topLevelAggregation).toBeDefined();

  expect(topLevelAggregation.items.length).toBe(2); // Parallel inputs (11n as two notes (10 + 1)), command

  // Top level ---------------
  expect(topLevelAggregation.type).toBe("serial");
  expect(topLevelAggregation.items.length).toBe(2);

  const topLevelAggregationInputs = topLevelAggregation.items[0];
  const topLevelAggregationCommand = topLevelAggregation.items[1];

  expect(topLevelAggregationInputs.type).toBe("parallel");
  expect(topLevelAggregationInputs.items.length).toBe(2);

  expect(topLevelAggregationCommand.type).toBe("command");
  expect(topLevelAggregationCommand.amount).toBe(11n);

  // Aggregations 1 and 2  -----------------
  // Aggregating 10 * 1n -> 10n and 10n + 1n -> 11n (two output notes)

  expect(topLevelAggregationInputs.items.length).toBe(2);

  const aggregation1 = topLevelAggregationInputs.items[0];
  const aggregation2 = topLevelAggregationInputs.items[1];

  expect(aggregation1.type).toBe("serial"); // (10 * 1n -> 10n)
  expect(aggregation2.type).toBe("serial"); // (1n -> 1n), TODO: Optimize the algorithm to exclude this step (should use existing note)

  expect(aggregation1.items.length).toBe(2);
  expect(aggregation2.items.length).toBe(2);

  const aggregation1Inputs = aggregation1.items[0];
  const aggregation1Command = aggregation1.items[1];

  const aggregation2Inputs = aggregation2.items[0];
  const aggregation2Command = aggregation2.items[1];

  expect(aggregation1Inputs.type).toBe("parallel");
  expect(aggregation2Inputs.type).toBe("parallel");

  expect(aggregation1Inputs.items.length).toBe(10); // 10 input notes
  expect(aggregation2Inputs.items.length).toBe(1); // 1 input note

  expect(aggregation1Command.type).toBe("command");
  expect(aggregation2Command.type).toBe("command");

  console.dir(topLevelAggregation, { depth: null });
});

test("should create single aggregations with change", () => {
  const intent: CurvyIntent = generateMockIntent(11n);

  const topLevelAggregation = generatePlan(exampleBalancesAggregatorHeavy2, intent) as any;

  expect(topLevelAggregation).toBeDefined();

  expect(topLevelAggregation.items.length).toBe(2); // One parallel inputs, one aggregation

  const parallelInputs = topLevelAggregation.items[0];
  expect(parallelInputs.type).toBe("parallel");
  expect(parallelInputs.items.length).toBe(2);

  // Input note 1
  expect(parallelInputs.items[0].type).toBe("serial");
  expect(parallelInputs.items[0].items[0].data.balance).toBe(6n);

  // Input note 2
  expect(parallelInputs.items[1].type).toBe("serial");
  expect(parallelInputs.items[1].items[0].data.balance).toBe(6n);

  // Final aggregation
  const aggregation = topLevelAggregation.items[1];
  expect(aggregation.type).toBe("command");
  expect(aggregation.amount).toBe(11n);

  console.dir(topLevelAggregation, { depth: null });
});

test("should deposit all funds from SA to aggregator and create single aggregations with change", () => {
  const intent: CurvyIntent = generateMockIntent(9n);

  const topLevelAggregation = generatePlan(exampleBalancesSAHeavy2, intent) as any;
  expect(topLevelAggregation).toBeDefined();

  expect(topLevelAggregation.type).toBe("serial");
  expect(topLevelAggregation.items.length).toBe(2);

  const topLevelAggregationInputs = topLevelAggregation.items[0];
  const topLevelAggregationCommand = topLevelAggregation.items[1];

  expect(topLevelAggregationInputs.type).toBe("parallel");
  expect(topLevelAggregationInputs.items.length).toBe(2);

  expect(topLevelAggregationCommand.type).toBe("command");
  expect(topLevelAggregationCommand.amount).toBe(9n);

  topLevelAggregationInputs.items.forEach((item: any) => {
    expect(item.type).toBe("serial");
    expect(item.items.length).toBe(3);
    expect(item.items[0].type).toBe("data");
    expect(item.items[1].name).toBe("sa-deposit-to-csuc");
    expect(item.items[1].type).toBe("command");
    expect(item.items[2].name).toBe("csuc-deposit-to-aggregator");
    expect(item.items[2].type).toBe("command");
  });

  console.dir(topLevelAggregation, { depth: null });
});

test("should fail to create plan with insufficient funds", () => {
  const intent: CurvyIntent = generateMockIntent(10n);
  const plan = generatePlan(exampleEmptySAHeavy2, intent);
  expect(plan).toBeUndefined();
});
