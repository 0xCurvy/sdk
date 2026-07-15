import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAggregateRequest } from "@/actions/aggregator/buildAggregateRequest";
import { buildWithdrawRequest } from "@/actions/aggregator/buildWithdrawRequest";
import { relaySubmission } from "@/actions/aggregator/relaySubmission";
import { waitForRelay } from "@/actions/aggregator/waitForRelay";
import { getSpendWitnesses } from "@/actions/notes/getSpendWitnesses";
import { syncNotes } from "@/actions/notes/syncNotes";
import { Note } from "@/note";
import type { Intent } from "@/planner/types";
import {
  createFakeApi,
  createFakeConfig,
  DEFAULT_TEST_PROTOCOL,
  fakeBalanceEntry,
  fakeCurvyAccount,
  fixtureNetwork,
} from "@/test/fixtures";
import type { BalanceEntry, CurvyId, HexString } from "@/types";
import { createCommand } from "./createCommand";

// The v3 client-proving execute path is mocked at the seam — local proving +
// relay + sync are exercised end-to-end by the devenv e2e; here we assert the
// command delegates to them. (Construction-only tests below don't call these.)
vi.mock("@/actions/aggregator/buildAggregateRequest", () => ({ buildAggregateRequest: vi.fn() }));
vi.mock("@/actions/aggregator/buildWithdrawRequest", () => ({ buildWithdrawRequest: vi.fn() }));
vi.mock("@/actions/aggregator/relaySubmission", () => ({ relaySubmission: vi.fn() }));
vi.mock("@/actions/aggregator/waitForRelay", () => ({ waitForRelay: vi.fn() }));
vi.mock("@/actions/notes/getSpendWitnesses", () => ({ getSpendWitnesses: vi.fn() }));
vi.mock("@/actions/notes/syncNotes", () => ({ syncNotes: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * `fakeBalanceEntry` ships a placeholder `deliveryTag.ephemeralKey` ("0xeph")
 * that the `Note` constructor (which expects a decimal "X.Y" key) rejects.
 * Override it with a valid one so `balanceEntryToNote` succeeds.
 */
function entry(overrides: Partial<BalanceEntry> = {}): BalanceEntry {
  return fakeBalanceEntry({ deliveryTag: { ephemeralKey: "4.5", viewTag: "0x6" }, ...overrides });
}

const NETWORK = fixtureNetwork();

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
  });
  return config;
}

describe("createCommand (dispatch)", () => {
  it("dispatches aggregator-aggregate to the aggregate command", () => {
    const config = buildConfig();
    const command = createCommand(config, {
      id: "cmd-1",
      name: "aggregator-aggregate",
      input: entry(),
    });
    expect(command.name).toBe("AggregatorAggregateCommand");
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
      name: "aggregator-withdraw",
      input: entry(),
      intent,
    });
    expect(command.name).toBe("AggregatorWithdrawToVaultCommand");
    expect(command.id).toBe("cmd-2");
  });

  it("throws on an unknown command name", () => {
    const config = buildConfig();
    expect(() => createCommand(config, { id: "cmd-3", name: "totally-unknown", input: entry() })).toThrow(
      "Unknown command name: totally-unknown",
    );
  });

  it("throws when aggregator-withdraw is missing its intent", () => {
    const config = buildConfig();
    expect(() => createCommand(config, { id: "cmd-4", name: "aggregator-withdraw", input: entry() })).toThrow(
      "Intent is required for aggregator withdraw command.",
    );
  });

  it("resolves the network from an array input's first entry", () => {
    const config = buildConfig();
    const command = createCommand(config, {
      id: "cmd-5",
      name: "aggregator-aggregate",
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
      name: "aggregator-aggregate",
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
      name: "aggregator-aggregate",
      input: entry({ balance: 1000n }),
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
      name: "aggregator-aggregate",
      input: entry({ balance: 1000n }),
    });

    const estimate = await command.estimateFees();
    // groupFee 10 => 1000 * 10 / 1000 = 10
    expect(estimate.curvyFeeInCurrency).toBe(10n);
    expect(estimate.gasFeeInCurrency).toBe(0n);
    expect(sendNote).toHaveBeenCalledTimes(1);
    // netAmount = 1000 - 10 - 0 = 990 (the amount requested for the output note)
    expect(sendNote.mock.calls[0][2]).toMatchObject({ amount: 990n });
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
      name: "aggregator-aggregate",
      input,
    });

    await command.estimateFees();
    const result = await command.execute();

    expect(getSpendWitnesses).toHaveBeenCalledTimes(1);
    expect(buildAggregateRequest).toHaveBeenCalledTimes(1);
    expect(relaySubmission).toHaveBeenCalledTimes(1);
    expect(waitForRelay).toHaveBeenCalledTimes(1);
    // execute returns the synced (committed) output balance entry.
    expect((result as BalanceEntry).id).toBe("42");
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
      name: "aggregator-withdraw",
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
      name: "aggregator-withdraw",
      input: entry(),
      intent: badIntent,
    });
    expect(() => command.recipient).toThrow("Withdraw command recipient must be a hex string address");
  });

  it("estimateFees computes the curvy fee (no bridge fee for a same-network intent)", async () => {
    const config = buildConfig();
    const command = createCommand(config, {
      id: "cmd-wd3",
      name: "aggregator-withdraw",
      input: entry({ balance: 1000n }),
      intent,
    });
    const estimate = await command.estimateFees();
    expect(estimate.curvyFeeInCurrency).toBe(10n);
    expect(estimate.gasFeeInCurrency).toBe(0n);
    expect(estimate.bridgeFeeInCurrency).toBeUndefined();
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
      name: "aggregator-withdraw",
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
    expect((result as { balance: bigint }).balance).toBe(990n);
  });
});
