import { describe, expect, it, vi } from "vitest";
import { MapStorage } from "@/storage/map-storage";
import { createFakeApi, createFakeConfig, fixtureNetwork } from "@/test/fixtures";
import type { HotOverlayReplacement, NotesCheckpoint, TransferHistoryRecord } from "@/types/storage";
import { reconcileTransferRecords } from "./reconcileTransferRecords";

const checkpoint: NotesCheckpoint = {
  networkSlug: "ethereum",
  environment: "testnet",
  leafCount: 0,
  nullifierCount: 0,
  root: "0",
  blockNumber: 10,
  finalizedBlockNumber: 10,
  finalizedBlockHash: "0xfinalized",
  checkpoint: "checkpoint-10",
  lastSynced: 1,
};

function intent(intentId: string, createdAt: number): TransferHistoryRecord {
  return {
    intentId,
    accountId: "account-a",
    networkSlug: "ethereum",
    direction: "outgoing",
    action: "aggregation",
    token: "1",
    amount: "100",
    recipients: ["recipient"],
    createdAt,
    statusUpdatedAt: createdAt,
    finalityPolicy: "included",
    localDependencyDepth: intentId === "parent" ? 0 : 1,
    hasExternalHotDependency: false,
    status: "input_spend_included",
    inputCommitments: [intentId === "parent" ? "base-note" : "parent-output"],
    expectedOutputCommitments: [`${intentId}-output`],
    activeAttemptGeneration: intentId === "parent" ? 1 : 0,
  };
}

describe("reconcileTransferRecords", () => {
  it("marks an orphaned attempt for rebuild and blocks its local descendants", async () => {
    const storage = new MapStorage();
    await storage.putNotesCheckpoint(checkpoint);
    await storage.putTransferIntent(intent("parent", 1));
    await storage.putTransferIntent(intent("child", 2));
    await storage.putIntentDependencies([
      {
        accountId: "account-a",
        fromIntentId: "parent",
        toIntentId: "child",
        noteId: "parent-output",
      },
    ]);
    await storage.putTransferAttempt({
      accountId: "account-a",
      intentId: "parent",
      generation: 1,
      referencedRoot: "0",
      referencedRootBlockHash: "0xfinalized",
      proofCreatedAt: 1,
      relayRequestId: "relay-parent",
      inclusionBlockNumber: 11,
      inclusionBlockHash: "0xorphaned",
      status: "included",
    });
    const overlay: HotOverlayReplacement = {
      state: {
        networkSlug: "ethereum",
        environment: "testnet",
        generation: 2,
        baseCheckpoint: "checkpoint-10",
        baseBlockNumber: 10,
        baseBlockHash: "0xfinalized",
        snapshot: "replacement",
        hotBlockNumber: 11,
        hotBlockHash: "0xreplacement",
        noteCount: 0,
        notesRoot: "0",
        nullifierCount: 0,
        finalityMode: "finalized",
        finalityStatus: "normal",
        observedFinalityLagSeconds: 12,
        estimatedSecondsToFinality: null,
        updatedAt: 2,
      },
      blocks: [
        {
          networkSlug: "ethereum",
          number: 11,
          hash: "0xreplacement",
          parentHash: "0xfinalized",
          timestamp: 12,
          announcements: [],
          committedNotes: [],
          nullifiers: [],
          postBlockNoteCount: 0,
          postBlockNotesRoot: "0",
          postBlockNullifierCount: 0,
        },
      ],
      accountId: "account-a",
      noteStates: [],
    };
    await storage.replaceHotOverlay(overlay);
    const config = createFakeConfig({
      storage,
      api: createFakeApi({
        relay: {
          GetSubmissionStatus: vi.fn(async () => ({
            requestId: "relay-parent",
            status: "needs_rebuild" as const,
            reorgReason: "referenced_root_orphaned",
          })),
        },
      }),
    });

    await reconcileTransferRecords({ config, accountId: "account-a", networkSlug: "ethereum", checkpoint });

    expect((await storage.getTransferAttempts("account-a", "parent"))[0].status).toBe("reorged");
    const records = await storage.getTransferIntents("account-a", "ethereum");
    expect(records.find((record) => record.intentId === "parent")?.status).toBe("rebuilding");
    expect(records.find((record) => record.intentId === "child")?.status).toBe("blocked_upstream");
  });

  it("recovers a missing relay request id from the stable intent", async () => {
    const storage = new MapStorage();
    await storage.putNotesCheckpoint(checkpoint);
    await storage.putTransferIntent(intent("parent", 1));
    await storage.putTransferAttempt({
      accountId: "account-a",
      intentId: "parent",
      generation: 1,
      referencedRoot: "0",
      referencedRootBlockHash: "0xfinalized",
      proofCreatedAt: 1,
      status: "submitted",
      errorCode: "relay_outcome_unknown",
    });
    const getByIntent = vi.fn(async () => ({
      requestId: "relay-recovered",
      status: "included" as const,
      transactionHash: "0xtx" as const,
      blockNumber: "11",
      blockHash: "0xblock",
    }));
    const config = createFakeConfig({
      storage,
      api: createFakeApi({ relay: { GetSubmissionByIntent: getByIntent } }),
      networks: [fixtureNetwork({ slug: "ethereum", chainId: "1" })],
    });

    await reconcileTransferRecords({ config, accountId: "account-a", networkSlug: "ethereum", checkpoint });

    expect((await storage.getTransferAttempts("account-a", "parent"))[0]).toMatchObject({
      relayRequestId: "relay-recovered",
      status: "included",
      inclusionBlockHash: "0xblock",
    });
  });
});
