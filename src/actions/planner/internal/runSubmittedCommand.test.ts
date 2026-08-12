import { beforeEach, describe, expect, it, vi } from "vitest";
import { relaySubmission } from "@/actions/aggregator/relaySubmission";
import { submitToChain } from "@/actions/aggregator/submitToChain";
import { waitForRelay } from "@/actions/aggregator/waitForRelay";
import { getSpendWitnesses } from "@/actions/notes/getSpendWitnesses";
import { syncNotes } from "@/actions/notes/syncNotes";
import { createFakeConfig, fakeBalanceEntry, fixtureNetwork } from "@/test/fixtures";
import { runSubmittedCommand } from "./runSubmittedCommand";

vi.mock("@/actions/aggregator/relaySubmission", () => ({ relaySubmission: vi.fn() }));
vi.mock("@/actions/aggregator/submitToChain", () => ({ submitToChain: vi.fn() }));
vi.mock("@/actions/aggregator/waitForRelay", () => ({ waitForRelay: vi.fn() }));
vi.mock("@/actions/notes/getSpendWitnesses", () => ({ getSpendWitnesses: vi.fn() }));
vi.mock("@/actions/notes/syncNotes", () => ({ syncNotes: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSpendWitnesses).mockResolvedValue({ notesRoot: 7n, proofs: [] } as never);
  vi.mocked(relaySubmission).mockResolvedValue({ requestId: "relay-1", status: "queued" } as never);
  vi.mocked(waitForRelay).mockResolvedValue({
    requestId: "relay-1",
    status: "included",
    blockNumber: "12",
    blockHash: "0xblock",
  } as never);
  vi.mocked(submitToChain).mockResolvedValue({
    transactionHash: "0xdirect",
    receipt: { blockNumber: 13n, blockHash: "0xdirectblock", status: "success" },
  } as never);
});

async function setup() {
  const input = [fakeBalanceEntry({ id: "note-1", finality: "finalized" })];
  const config = createFakeConfig({ networks: [fixtureNetwork()] });
  config.storage.getProjectedBalances = vi.fn(async () => input);
  await config.storage.putNotesCheckpoint({
    networkSlug: "ethereum",
    environment: "mainnet",
    leafCount: 1,
    nullifierCount: 0,
    root: "7",
    blockNumber: 12,
    finalizedBlockNumber: 12,
    finalizedBlockHash: "0xblock",
    lastSynced: 1,
  });
  return { config, input };
}

describe("runSubmittedCommand", () => {
  it("keeps intent, attempt, and settlement status in sync through inclusion", async () => {
    const { config, input } = await setup();
    const build = vi.fn(async () => ({ action: "aggregation", publicSignals: [] }) as never);

    await runSubmittedCommand({
      config,
      commandId: "intent-1",
      action: "aggregation",
      accountId: "account-a",
      networkSlug: "ethereum",
      input,
      noteIds: [1n],
      token: "1",
      amount: "50",
      recipients: ["bob.curvy.name"],
      finalityPolicy: "included",
      submissionMode: "relay",
      build,
      outputCommitments: () => ["output-1"],
      terminalStatus: () => "input_spend_included",
    });

    expect(syncNotes).toHaveBeenCalledOnce();
    expect(build).toHaveBeenCalledOnce();
    expect((await config.storage.getTransferAttempts("account-a", "intent-1"))[0]).toMatchObject({
      status: "included",
      relayRequestId: "relay-1",
      inclusionBlockNumber: 12,
    });
    expect((await config.storage.getTransferIntents("account-a"))[0]).toMatchObject({
      status: "input_spend_included",
      expectedOutputCommitments: ["output-1"],
    });
    expect((await config.storage.getTransferSettlements("account-a", "intent-1"))[0]).toMatchObject({
      outputCommitment: "output-1",
      status: "pending",
    });
  });

  it("marks both records failed when proof construction fails", async () => {
    const { config, input } = await setup();

    await expect(
      runSubmittedCommand({
        config,
        commandId: "intent-failed",
        action: "withdrawal",
        accountId: "account-a",
        networkSlug: "ethereum",
        input,
        noteIds: [1n],
        token: "1",
        amount: "50",
        recipients: ["0xrecipient"],
        finalityPolicy: "included",
        submissionMode: "relay",
        build: async () => Promise.reject(new Error("prover unavailable")),
        terminalStatus: () => "input_spend_included",
      }),
    ).rejects.toThrow("prover unavailable");

    expect((await config.storage.getTransferAttempts("account-a", "intent-failed"))[0].status).toBe("failed");
    expect((await config.storage.getTransferIntents("account-a"))[0].status).toBe("failed");
  });

  it("persists a definitive asynchronous relay failure", async () => {
    const { config, input } = await setup();
    vi.mocked(waitForRelay).mockResolvedValue({
      requestId: "relay-1",
      status: "failed",
      error: "execution reverted",
    } as never);

    await expect(
      runSubmittedCommand({
        config,
        commandId: "intent-relay-failed",
        action: "aggregation",
        accountId: "account-a",
        networkSlug: "ethereum",
        input,
        noteIds: [1n],
        token: "1",
        amount: "50",
        recipients: ["bob.curvy.name"],
        finalityPolicy: "included",
        submissionMode: "relay",
        build: async () => ({ action: "aggregation", publicSignals: [] }) as never,
        terminalStatus: () => "input_spend_included",
      }),
    ).rejects.toThrow(/not canonically included/);

    expect((await config.storage.getTransferAttempts("account-a", "intent-relay-failed"))[0]).toMatchObject({
      status: "failed",
      errorCode: "execution reverted",
    });
    expect((await config.storage.getTransferIntents("account-a"))[0].status).toBe("failed");
  });

  it("submits directly with the configured wallet adapter and records inclusion", async () => {
    const { config, input } = await setup();
    const walletClient = { account: { address: "0xsender" } } as never;
    const directSubmitter = vi.fn(async () => walletClient);
    const submission = { action: "withdrawal", networkSlug: "ethereum", publicSignals: [] } as never;

    await runSubmittedCommand({
      config,
      commandId: "intent-direct",
      action: "withdrawal",
      accountId: "account-a",
      networkSlug: "ethereum",
      input,
      noteIds: [1n],
      token: "1",
      amount: "50",
      recipients: ["0xrecipient"],
      finalityPolicy: "included",
      submissionMode: "direct",
      directSubmitter,
      build: async () => submission,
      terminalStatus: () => "input_spend_included",
    });

    expect(directSubmitter).toHaveBeenCalledWith({ network: expect.objectContaining({ slug: "ethereum" }) });
    expect(submitToChain).toHaveBeenCalledWith({ config, request: submission, walletClient });
    expect(relaySubmission).not.toHaveBeenCalled();
    expect((await config.storage.getTransferAttempts("account-a", "intent-direct"))[0]).toMatchObject({
      status: "included",
      relayTxHash: "0xdirect",
      inclusionBlockNumber: 13,
    });
    expect((await config.storage.getTransferIntents("account-a"))[0].status).toBe("input_spend_included");
  });
});
