//@ts-nocheck
import { NETWORK_FLAVOUR, NETWORK_GROUP } from "@/constants/networks";
import type { CurvyIntent } from "@/planner/plan";
import { generatePlan } from "@/planner/planner";
import type { Currency, VaultBalanceEntry, Network, NoteBalanceEntry, SaBalanceEntry } from "@/types";

const mockCurrency: Currency = {
  id: 0,
  name: "mock",
  symbol: "",
  coinmarketcapId: "",
  iconUrl: "",
  price: "",
  updatedAt: "",
  decimals: 18,
  contractAddress: "",
  nativeCurrency: false,
  vaultTokenId: 1,
};
const mockNetwork: Network = {
  id: 1,
  name: "Mock Network",
  group: NETWORK_GROUP.ETHEREUM,
  testnet: true,
  slip0044: 1,
  flavour: NETWORK_FLAVOUR.EVM,
  multiCallContractAddress: "0x0000000000000000000000000000000000000000",
  vaultContractAddress: "0x0000000000000000000000000000000000000001",
  aggregatorContractAddress: "0x0000000000000000000000000000000000000002",
  nativeCurrency: "MockToken",
  chainId: "0x1",
  blockExplorerUrl: "https://mockexplorer.com",
  rpcUrl: "https://mock-rpc-url.com",
  currencies: [mockCurrency],
  aggregationCircuitConfig: {
    circuit: "verifyAggregation_2_2_2",
    maxInputs: 2,
    treeDepth: 20,
    maxOutputs: 2,
    batchSize: 2,
    groupFee: 1,
  },
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
      decimals: 18,
      vaultTokenId: BigInt(1),
      createdAt: Date.now().toString(),
      walletId: "mock-wallet-id",
      lastUpdated: Date.now(),
    };
  });
};

const generateMockVaultBalances = (...balances: bigint[]): VaultBalanceEntry[] => {
  return balances.map((balance) => {
    return {
      source: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      currencyAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      networkSlug: "ethereum-sepolia",
      type: "vault",
      symbol: "ETH",
      balance,
      vaultTokenId: BigInt(1),
      decimals: 18,
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
      decimals: 18,
      balance,
      vaultTokenId: BigInt(1),
      environment: "testnet" as "testnet" | "mainnet",
      createdAt: Date.now().toString(),
      walletId: "mock-wallet-id",
      lastUpdated: Date.now(),
      deliveryTag: {
        viewTag: "",
        ephemeralKey: "",
      },
      owner: {
        babyJubjubPublicKey: {
          x: "0",
          y: "0",
        },
        sharedSecret: "",
      },
    };
  });
};

const generateMockIntent = (amount: bigint, maxInputs: number, sendToCurvyName = false): CurvyIntent => {
  const network = mockNetwork;
  network.aggregationCircuitConfig.maxInputs = maxInputs;

  return {
    amount,
    toAddress: sendToCurvyName ? "vitalik.curvy.name" : "0xafefe",
    currency: mockCurrency,
    network,
  };
};

test("test for more than N aggregations", () => {
  const maxInputs = 2;
  const intent: CurvyIntent = generateMockIntent(20n, maxInputs);
  const balances = generateMockNoteBalances(...Array(19).fill(1n), 2n);

  const plan = generatePlan(balances, intent) as any;
  expect(plan).toBeDefined();

  const checkRecursivelyForItemsLength = (obj) => {
    if (Array.isArray(obj.items)) {
      expect(obj.items.length).toBeLessThanOrEqual(maxInputs);

      obj.items.forEach((item) => {
        checkRecursivelyForItemsLength(item);
      });
    }
  };

  checkRecursivelyForItemsLength(plan.items[0]);

  expect(plan.items.map((item) => planToString(item))).toEqual([
    "parallel",
    "aggregator-aggregate",
    "aggregator-withdraw-to-vault",
    "vault-withdraw-to-eoa",
  ]);
});

test("should aggregate with one vault balance", () => {
  const maxInputs = 2;
  const intent: CurvyIntent = generateMockIntent(1000000000000000000n, maxInputs);
  const balances = generateMockVaultBalances(9999944316399554532n);

  const { plan } = generatePlan(balances, intent);
  expect(plan).toBeDefined();

  // Expect entire plan to look like this
  expect(plan.items.map((item) => planToString(item))).toEqual([
    "serial",
    "aggregator-aggregate",
    "aggregator-withdraw-to-vault",
    "vault-withdraw-to-eoa",
  ]);

  // Expect first serial to be aggregator onboard
  expect(plan.items[0].type).toBe("serial");
  expect(plan.items[0].items).toHaveLength(2);

  // Expect aggregator onboard to look like this
  expect(plan.items[0].items.map((item) => planToString(item))).toEqual(["data", "vault-deposit-to-aggregator"]);
});

function planToString(plan: CurvyPlan) {
  if (plan.type === "command") return plan.name;
  return plan.type;
}
