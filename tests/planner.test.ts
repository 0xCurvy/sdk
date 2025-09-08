import { NETWORK_FLAVOUR, NETWORK_GROUP } from "@/constants/networks";
import { CurvyCommandNoteAddress } from "@/planner/addresses/note";
import { CurvyCommandSAAddress } from "@/planner/addresses/sa";
import type { CurvyIntent } from "@/planner/plan";
import { generatePlan, type PlannerBalances } from "@/planner/planner";
import type { Currency, Network } from "@/types";
import { Note } from "@/types/note";

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

const generateMockSABalances = (...balances: bigint[]): CurvyCommandSAAddress[] => {
  return balances.map((balance) => {
    return new CurvyCommandSAAddress(balance, mockCurrency, "", "");
  });
};

const generateMockCSUCBalances = (...balances: bigint[]): CurvyCommandSAAddress[] => {
  return balances.map((balance) => {
    return new CurvyCommandSAAddress(balance, mockCurrency, "", "");
  });
};

const generateMockNoteBalances = (...balances: bigint[]): CurvyCommandNoteAddress[] => {
  return balances.map((balance) => {
    //@ts-expect-error
    return new CurvyCommandNoteAddress(new Note({ balance: { amount: balance }, ownerHash: 1n }), "");
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

test("should generate something", () => {
  const intent: CurvyIntent = generateMockIntent(1n);

  const plan = generatePlan(exampleBalances, intent);
  expect(plan).toBeDefined();

  console.dir(plan, { depth: null });
});

test("simple, but go through all three levels", () => {
  const intent: CurvyIntent = generateMockIntent(8n);

  const plan = generatePlan(exampleBalances, intent);
  expect(plan).toBeDefined();

  console.dir(plan, { depth: null });
});
