import { describe, expect, it } from "vitest";
import { NETWORK_ENVIRONMENT } from "@/constants/networks";
import { MapStorage } from "@/storage/map-storage";
import { createFakeConfig, fixtureNetwork } from "@/test/fixtures";
import type { TransferHistoryRecord, TxHistoryEntry } from "@/types/storage";
import { getTransactionHistory } from "./getTransactionHistory";

const ACCOUNT = "account-a";
const NETWORK = "ethereum";

const intent = (overrides: Partial<TransferHistoryRecord>): TransferHistoryRecord => ({
  intentId: "intent",
  accountId: ACCOUNT,
  networkSlug: NETWORK,
  direction: "outgoing",
  action: "aggregation",
  token: "1",
  amount: "50",
  recipients: ["bob.curvy.name"],
  createdAt: 300,
  statusUpdatedAt: 300,
  finalityPolicy: "included",
  localDependencyDepth: 0,
  hasExternalHotDependency: false,
  status: "available_hot",
  inputCommitments: ["local-input"],
  expectedOutputCommitments: ["local-output"],
  activeAttemptGeneration: 1,
  ...overrides,
});

const chainEntry = (overrides: Partial<TxHistoryEntry>): TxHistoryEntry => ({
  id: `${NETWORK}:external-note:receive`,
  accountId: ACCOUNT,
  networkSlug: NETWORK,
  environment: NETWORK_ENVIRONMENT.MAINNET,
  kind: "receive",
  origin: "transfer",
  noteId: "external-note",
  amount: "25",
  token: "1",
  finality: "finalized",
  status: "finalized",
  observedAt: 200,
  ...overrides,
});

describe("getTransactionHistory", () => {
  it("collapses local dependency steps and suppresses their note-level duplicates", async () => {
    const storage = new MapStorage();
    const network = fixtureNetwork();
    const config = createFakeConfig({
      storage,
      networks: [network],
      activeNetworks: [network],
      activeAccountId: ACCOUNT,
    });
    await storage.upsertCurrencyMetadata(
      new Map([
        [
          "eth",
          {
            address: "0x0000000000000000000000000000000000000001",
            vaultTokenId: "1",
            symbol: "ETH",
            name: "Ether",
            decimals: 18,
            iconUrl: "eth.svg",
            networkSlug: NETWORK,
            environment: NETWORK_ENVIRONMENT.MAINNET,
          },
        ],
      ]),
    );
    await storage.putTransferIntent(intent({ intentId: "parent", createdAt: 100, recipients: ["self"] }));
    await storage.putTransferIntent(intent({ intentId: "child" }));
    await storage.putIntentDependencies([
      { accountId: ACCOUNT, fromIntentId: "parent", toIntentId: "child", noteId: "parent-output" },
    ]);
    await storage.putTransferAttempt({
      accountId: ACCOUNT,
      intentId: "child",
      generation: 1,
      referencedRoot: "1",
      referencedRootBlockHash: "0xroot",
      proofCreatedAt: 250,
      relayTxHash: "0xrelay",
      status: "included",
    });
    await storage.putTxHistory([
      chainEntry({ noteId: "local-output", id: `${NETWORK}:local-output:receive` }),
      chainEntry({ kind: "spend", noteId: "local-input", id: `${NETWORK}:local-input:spend` }),
      chainEntry({}),
      chainEntry({ kind: "spend", noteId: "other-spend", id: `${NETWORK}:other-spend:spend`, observedAt: 150 }),
    ]);

    const history = await getTransactionHistory({ config });

    expect(history.map((item) => item.id)).toEqual([
      "intent:child",
      `chain:${NETWORK}:external-note:receive`,
      `chain:${NETWORK}:other-spend:spend`,
    ]);
    expect(history[0]).toMatchObject({
      kind: "send",
      transactionHash: "0xrelay",
      status: "available_hot",
      currency: { symbol: "ETH", decimals: 18 },
    });
  });

  it("filters by vault token id and applies the requested limit", async () => {
    const storage = new MapStorage();
    const network = fixtureNetwork();
    const config = createFakeConfig({
      storage,
      networks: [network],
      activeNetworks: [network],
      activeAccountId: ACCOUNT,
    });
    await storage.putTxHistory([
      chainEntry({ id: "one", token: "1", observedAt: 1 }),
      chainEntry({ id: "two", token: "2", observedAt: 2 }),
      chainEntry({ id: "three", token: "1", observedAt: 3 }),
    ]);

    const history = await getTransactionHistory({ config, token: "1", limit: 1 });

    expect(history.map((item) => item.id)).toEqual(["chain:three"]);
  });
});
