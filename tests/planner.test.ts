import { NETWORK_FLAVOUR, NETWORK_GROUP } from "@/constants/networks";
import type { CurvyIntent } from "@/planner/plan";
import { generatePlan, type PlannerBalances } from "@/planner/planner";
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
        babyJubPubKey: {
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
