import { getQuote } from "@lifi/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAggregateRequest } from "@/actions/aggregator/buildAggregateRequest";
import { buildWithdrawRequest } from "@/actions/aggregator/buildWithdrawRequest";
import { estimateAggregationCosts } from "@/actions/aggregator/internal/estimateAggregationCosts";
import { relaySubmission } from "@/actions/aggregator/relaySubmission";
import { waitForRelay } from "@/actions/aggregator/waitForRelay";
import { getSpendWitnesses } from "@/actions/notes/getSpendWitnesses";
import { syncNotes } from "@/actions/notes/syncNotes";
import { FeeEstimateUnavailableError } from "@/errors";
import { Note } from "@/note";
import type { Intent } from "@/planner/types";
import {
  createFakeApi,
  createFakeConfig,
  createFakeMultiRpc,
  DEFAULT_TEST_PROTOCOL,
  fakeBalanceEntry,
  fakeCurvyAccount,
  fixtureNetwork,
} from "@/test/fixtures";
import type { BalanceEntry, CurvyId, HexString } from "@/types";
import { createCommand } from "./createCommand";

// Mock expensive proving and external IO at their action boundaries; these
// tests verify command allocation, delegation, and bookkeeping contracts.
vi.mock("@/actions/aggregator/buildAggregateRequest", () => ({ buildAggregateRequest: vi.fn() }));
vi.mock("@/actions/aggregator/buildWithdrawRequest", () => ({ buildWithdrawRequest: vi.fn() }));
vi.mock("@/actions/aggregator/internal/estimateAggregationCosts", () => ({ estimateAggregationCosts: vi.fn() }));
vi.mock("@/actions/aggregator/relaySubmission", () => ({ relaySubmission: vi.fn() }));
vi.mock("@/actions/aggregator/waitForRelay", () => ({ waitForRelay: vi.fn() }));
vi.mock("@/actions/notes/getSpendWitnesses", () => ({ getSpendWitnesses: vi.fn() }));
vi.mock("@/actions/notes/syncNotes", () => ({ syncNotes: vi.fn() }));
vi.mock("@lifi/sdk", () => ({ getQuote: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(estimateAggregationCosts).mockResolvedValue({
    operator: { S: "operator-S", V: "operator-V", babyJubjubPublicKey: "3.4" },
    relayFee: 0n,
    commitmentFee: 10n,
    protocolFeePerThousand: 0n,
  });
});

/**
 * `fakeBalanceEntry` ships a placeholder `deliveryTag.ephemeralKey` ("0xeph")
 * that the `Note` constructor (which expects a decimal "X.Y" key) rejects.
 * Override it with a valid one so `balanceEntryToNote` succeeds.
 */
function entry(overrides: Partial<BalanceEntry> = {}): BalanceEntry {
  return fakeBalanceEntry({ deliveryTag: { ephemeralKey: "4.5", viewTag: "0x6" }, ...overrides });
}

const NETWORK = fixtureNetwork({ vaultContractAddress: "0x0000000000000000000000000000000000000010" });

/** Protocol-global proving config with groupFee 10 on both aggregation and withdrawal. */
const PROTOCOL = {
  ...DEFAULT_TEST_PROTOCOL,
  proving: {
    ...DEFAULT_TEST_PROTOCOL.proving,
    aggregation: { ...DEFAULT_TEST_PROTOCOL.proving.aggregation, groupFee: 10 },
    withdrawal: { ...DEFAULT_TEST_PROTOCOL.proving.withdrawal, groupFee: 10 },
  },
};

/** A config wired so both `getActiveAccount` (state) and `signMessage` (live map) resolve. */
function buildConfig(api = createFakeApi()) {
  const account = fakeCurvyAccount();
  const rpc = createFakeMultiRpc();
  rpc.Network = vi.fn(() => ({ provider: { readContract: vi.fn(async () => ({ withdrawal: 0n })) } }) as never);
  const config = createFakeConfig({
    api,
    networks: [NETWORK],
    protocol: PROTOCOL,
    activeAccountId: "account-a",
    accounts: {
      "account-a": {
        id: "account-a",
        createdAt: 1_700_000_000_000,
        ownerAddress: "0x000000000000000000000000000000000000000a",
        curvyHandle: "alice.curvy.name" as CurvyId,
        scanCursors: { latest: undefined, oldest: undefined },
      },
    },
    liveAccounts: new Map([["account-a", account]]),
    rpc,
  });
  return config;
}

describe("createCommand (dispatch)", () => {
  it("dispatches aggregator-aggregate to the aggregate command", () => {
    const config = buildConfig();
    const command = createCommand(config, {
      id: "cmd-1",
      kind: "aggregator-aggregate",
      input: [entry()],
    });
    expect(command.kind).toBe("aggregator-aggregate");
    expect(command.id).toBe("cmd-1");
  });

  it("dispatches aggregator-withdraw to the withdraw command", () => {
    const config = buildConfig();
    const intent: Intent = {
      type: "external-transfer",
      amount: 100n,
      currency: { contractAddress: "0xcafe" as HexString } as never,
      network: NETWORK,
      recipient: "0x000000000000000000000000000000000000dEaD" as HexString,
    };
    const command = createCommand(config, {
      id: "cmd-2",
      kind: "aggregator-withdraw",
      input: [entry()],
      intent,
    });
    expect(command.kind).toBe("aggregator-withdraw");
    expect(command.id).toBe("cmd-2");
  });

  it("throws on an unknown command name", () => {
    const config = buildConfig();
    expect(() => createCommand(config, { id: "cmd-3", kind: "totally-unknown" as never, input: [entry()] })).toThrow(
      "Unknown command kind: totally-unknown",
    );
  });

  it("throws when aggregator-withdraw is missing its intent", () => {
    const config = buildConfig();
    expect(() => createCommand(config, { id: "cmd-4", kind: "aggregator-withdraw", input: [entry()] })).toThrow(
      "Intent is required for aggregator withdraw command.",
    );
  });

  it("resolves the network from an array input's first entry", () => {
    const config = buildConfig();
    const command = createCommand(config, {
      id: "cmd-5",
      kind: "aggregator-aggregate",
      input: [entry({ balance: 400n }), entry({ balance: 600n })],
    });
    expect(command.grossAmount).toBe(1000n);
  });
});

describe("aggregator-aggregate command", () => {
  it("exposes grossAmount as the sum of input notes and the sender handle as recipient", () => {
    const config = buildConfig();
    const command = createCommand(config, {
      id: "cmd-agg",
      kind: "aggregator-aggregate",
      input: [entry({ balance: 700n }), entry({ balance: 300n })],
    });
    expect(command.grossAmount).toBe(1000n);
    // No intent => aggregate to self (active account's handle).
    expect(command.recipient).toBe("alice.curvy.name");
  });

  it("uses the intent recipient when an intent with a curvy handle is provided", () => {
    const config = buildConfig();
    const intent: Intent = {
      type: "curvy-transfer",
      amount: 500n,
      currency: {} as never,
      network: NETWORK,
      recipient: "bob.curvy.name" as CurvyId,
    };
    const command = createCommand(config, {
      id: "cmd-agg2",
      kind: "aggregator-aggregate",
      input: [entry({ balance: 1000n })],
      intent,
    });
    expect(command.recipient).toBe("bob.curvy.name");
  });

  it("estimateFees computes the curvy fee and mints the output note", async () => {
    const outputNote = Note.random({ amount: 990n, token: 1n });
    const sendNote = vi.fn(
      async (_S: string, _V: string, _noteData: { ownerBabyJubjubPublicKey: string; amount: bigint; token: bigint }) =>
        outputNote,
    );
    const config = buildConfig();
    config.core.sendNote = sendNote as never;
    config.api.user.ResolveCurvyId = vi.fn(async () => ({
      data: {
        createdAt: "2024-01-01T00:00:00.000Z",
        publicKeys: { spendingKey: "0xS", viewingKey: "0xV", babyJubjubPublicKey: "1.2" },
      },
    }));

    const command = createCommand(config, {
      id: "cmd-agg3",
      kind: "aggregator-aggregate",
      input: [entry({ balance: 1000n })],
    });

    const estimate = await command.estimateFees();
    // groupFee 10 => 1000 * 10 / 1000 = 10
    expect(estimate.curvyFeeInCurrency).toBe(10n);
    expect(estimate.gasFeeInCurrency).toBe(0n);
    expect(sendNote).toHaveBeenCalledTimes(1);
    // netAmount = 1000 - 10 - 0 = 990 (the amount requested for the output note)
    expect(sendNote.mock.calls[0][2]).toMatchObject({ amount: 990n });
  });

  it("estimates direct aggregation without requiring relay operator keys", async () => {
    vi.mocked(estimateAggregationCosts).mockResolvedValueOnce({
      relayFee: 0n,
      commitmentFee: 10n,
      protocolFeePerThousand: 0n,
    });
    const config = buildConfig();
    config.core.sendNote = vi.fn(async () => Note.random({ amount: 990n, token: 1n })) as never;
    config.api.user.ResolveCurvyId = vi.fn(async () => ({
      data: {
        createdAt: "2024-01-01T00:00:00.000Z",
        publicKeys: { spendingKey: "0xS", viewingKey: "0xV", babyJubjubPublicKey: "1.2" },
      },
    }));
    const command = createCommand(config, {
      id: "cmd-direct",
      kind: "aggregator-aggregate",
      input: [entry({ balance: 1000n })],
      submissionMode: "direct",
    });

    await expect(command.estimateFees()).resolves.toMatchObject({ gasFeeInCurrency: 0n, deliveredAmount: 990n });
    expect(estimateAggregationCosts).toHaveBeenCalledWith(expect.objectContaining({ submissionMode: "direct" }));
  });

  it("execute proves locally, relays, and returns the committed output once synced", async () => {
    const config = buildConfig();
    config.core.sendNote = vi.fn(async () => Note.random({ amount: 990n, token: 1n })) as never;
    config.api.user.ResolveCurvyId = vi.fn(async () => ({
      data: {
        createdAt: "2024-01-01T00:00:00.000Z",
        publicKeys: { spendingKey: "0xS", viewingKey: "0xV", babyJubjubPublicKey: "1.2" },
      },
    }));
    vi.mocked(getSpendWitnesses).mockResolvedValue({ proofs: [], notesRoot: 0n } as never);
    // buildAggregateRequest mints the recipient output note (id 42); the planner
    // waits for it to be committed + synced before returning it.
    vi.mocked(buildAggregateRequest).mockResolvedValue({
      action: "aggregation",
      outputNotes: [{ id: 42n }],
      publicSignals: [],
    } as never);
    vi.mocked(relaySubmission).mockResolvedValue({ requestId: "req-agg", status: "queued" } as never);
    vi.mocked(waitForRelay).mockResolvedValue({ status: "finalized" } as never);
    vi.mocked(syncNotes).mockResolvedValue([] as never);
    await config.storage.putNotesCheckpoint({
      networkSlug: "ethereum",
      environment: "mainnet",
      leafCount: 0,
      nullifierCount: 0,
      root: "0",
      blockNumber: 10,
      finalizedBlockNumber: 10,
      finalizedBlockHash: "0xfinalized",
      lastSynced: 1,
    });
    // The committed output surfaces in storage as balance id "42".
    const input = entry({ balance: 1000n });
    const synced = entry({ id: "42", balance: 990n });
    config.storage.getProjectedBalances = vi.fn().mockResolvedValueOnce([input]).mockResolvedValue([synced]);

    const command = createCommand(config, {
      id: "cmd-agg4",
      kind: "aggregator-aggregate",
      input: [input],
    });

    await command.estimateFees();
    const result = await command.execute();

    expect(getSpendWitnesses).toHaveBeenCalledTimes(1);
    expect(buildAggregateRequest).toHaveBeenCalledTimes(1);
    expect(vi.mocked(buildAggregateRequest).mock.calls[0][0].recipients).toEqual([
      { note: (command.getExecutionData() as { note: Note }).note },
    ]);
    expect(relaySubmission).toHaveBeenCalledTimes(1);
    expect(waitForRelay).toHaveBeenCalledTimes(1);
    // execute returns the synced (committed) output balance entry.
    expect((result as BalanceEntry[])[0].id).toBe("42");
  });
});

describe("aggregator-withdraw command", () => {
  const intent: Intent = {
    type: "external-transfer",
    amount: 100n,
    currency: { contractAddress: "0xcafe" as HexString } as never,
    network: NETWORK,
    // No exitNetwork => no getQuote bridge-fee path.
    recipient: "0x000000000000000000000000000000000000dEaD" as HexString,
  };

  it("exposes grossAmount and the hex recipient", () => {
    const config = buildConfig();
    const command = createCommand(config, {
      id: "cmd-wd",
      kind: "aggregator-withdraw",
      input: [entry({ balance: 600n }), entry({ balance: 400n })],
      intent,
    });
    expect(command.grossAmount).toBe(1000n);
    expect(command.recipient).toBe("0x000000000000000000000000000000000000dEaD");
  });

  it("throws when the recipient is not a hex string", () => {
    const config = buildConfig();
    const badIntent = { ...intent, recipient: "not-a-hex" as never };
    const command = createCommand(config, {
      id: "cmd-wd2",
      kind: "aggregator-withdraw",
      input: [entry()],
      intent: badIntent,
    });
    expect(() => command.recipient).toThrow("Withdraw command recipient must be a hex string address");
  });

  it("estimateFees computes the curvy fee (no bridge fee for a same-network intent)", async () => {
    const config = buildConfig();
    const command = createCommand(config, {
      id: "cmd-wd3",
      kind: "aggregator-withdraw",
      input: [entry({ balance: 1000n })],
      intent,
    });
    const estimate = await command.estimateFees();
    expect(estimate.curvyFeeInCurrency).toBe(10n);
    expect(estimate.gasFeeInCurrency).toBe(0n);
    expect(estimate.bridgeFeeInCurrency).toBeUndefined();
    expect(estimate).toMatchObject({ deliveredAmount: 990n, totalFeeInCurrency: 10n });
  });

  it("reports the quoted delivered amount for a portal route", async () => {
    vi.mocked(getQuote).mockResolvedValue({
      action: {
        fromToken: { chainId: 1, address: "0xcafe", decimals: 6, priceUSD: "1" },
      },
      estimate: { toAmount: "875", feeCosts: [], gasCosts: [] },
    } as never);
    const exitCurrency = { contractAddress: "0xbeef" as HexString } as never;
    const config = buildConfig();
    const command = createCommand(config, {
      id: "cmd-wd-portal",
      kind: "aggregator-withdraw",
      input: [entry({ balance: 1000n })],
      intent: { ...intent, exitAddress: intent.recipient, exitCurrency },
    });

    const estimate = await command.estimateFees();
    const delivered = await command.getResultingData();

    expect(estimate.bridgeEstimateAmount).toBe("875");
    expect(delivered).toMatchObject({ kind: "delivered", amount: 875n, currencyAddress: "0xbeef" });
  });

  it("fails the estimate when the on-chain withdrawal fee cannot be read", async () => {
    const config = buildConfig();
    vi.mocked(config.getRpc().Network).mockReturnValue({
      provider: { readContract: vi.fn(async () => Promise.reject(new Error("rpc unavailable"))) },
    } as never);
    const command = createCommand(config, {
      id: "cmd-wd-fee-error",
      kind: "aggregator-withdraw",
      input: [entry({ balance: 1000n })],
      intent,
    });

    await expect(command.estimateFees()).rejects.toBeInstanceOf(FeeEstimateUnavailableError);
  });

  it("execute proves the withdrawal locally and relays it", async () => {
    const config = buildConfig();
    vi.mocked(getSpendWitnesses).mockResolvedValue({ proofs: [], notesRoot: 0n } as never);
    vi.mocked(buildWithdrawRequest).mockResolvedValue({ action: "withdrawal", publicSignals: [] } as never);
    vi.mocked(relaySubmission).mockResolvedValue({ requestId: "req-wd", status: "queued" } as never);
    vi.mocked(waitForRelay).mockResolvedValue({ status: "finalized" } as never);
    await config.storage.putNotesCheckpoint({
      networkSlug: "ethereum",
      environment: "mainnet",
      leafCount: 0,
      nullifierCount: 0,
      root: "0",
      blockNumber: 10,
      finalizedBlockNumber: 10,
      finalizedBlockHash: "0xfinalized",
      lastSynced: 1,
    });
    const input = [entry({ id: "note-1", balance: 600n }), entry({ id: "note-2", balance: 400n })];
    config.storage.getProjectedBalances = vi.fn(async () => input);

    const command = createCommand(config, {
      id: "cmd-wd4",
      kind: "aggregator-withdraw",
      // v3 withdrawal consumes exactly maxInputs (2) committed notes.
      input,
      intent,
    });

    await command.estimateFees();
    const result = await command.execute();

    expect(getSpendWitnesses).toHaveBeenCalledTimes(1);
    expect(buildWithdrawRequest).toHaveBeenCalledTimes(1);
    expect(relaySubmission).toHaveBeenCalledTimes(1);
    expect(waitForRelay).toHaveBeenCalledTimes(1);
    // netAmount = 1000 - 10 - 0 = 990
    expect(result).toMatchObject({ kind: "delivered", amount: 990n });
  });
});
