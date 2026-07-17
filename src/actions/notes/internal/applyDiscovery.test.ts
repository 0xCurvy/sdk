import { describe, expect, it, vi } from "vitest";
import { NETWORK_ENVIRONMENT } from "@/constants/networks";
import type { OwnershipResolver } from "@/note/discoverOwnedNotes";
import type { SyncedLeaf } from "@/note/notesTreeSync";
import { MapStorage } from "@/storage/map-storage";
import { accounts, createFakeApi, createFakeConfig, fixtureNetwork } from "@/test/fixtures";
import type { CurrencyMetadata } from "@/types/storage";
import { poseidonHash } from "@/utils/hash/poseidonHash";
import { applyAccountDiscovery } from "./applyDiscovery";

const NET = "ethereum";
const MAINNET = NETWORK_ENVIRONMENT.MAINNET;
const network = fixtureNetwork({ aggregatorContractAddress: "0x00000000000000000000000000000000000000aa" });
const ACCOUNT = accounts[0].id;

// An ownable plaintext note with the real id algebra, so discovery's integrity gate passes.
const OWNER_PUB: [bigint, bigint] = [3n, 4n];
const OWNER_SS = 5n;
const OWNED_ID = poseidonHash([poseidonHash([OWNER_PUB[0], OWNER_PUB[1], OWNER_SS]), 100n, 1n]);
const NULLIFIER = poseidonHash([OWNER_SS, OWNER_PUB[0], OWNER_PUB[1]]);

const ownableLeaf = (index: number): SyncedLeaf => ({
  index,
  noteId: OWNED_ID.toString(),
  ephemeralKey: ["1", "2"],
  viewTag: 0,
  amount: "100",
  token: "1",
  isPlaintext: true,
  blockNumber: 5,
  requestTxHash: "0xrequest",
});
const otherLeaf = (index: number, id: number): SyncedLeaf => ({ index, noteId: String(id) });

const resolver: OwnershipResolver = async (leaf) =>
  leaf.noteId === OWNED_ID.toString() ? { sharedSecret: OWNER_SS, ownerPub: OWNER_PUB } : null;

const ethMetadata: CurrencyMetadata = {
  address: "0x0000000000000000000000000000000000000000",
  vaultTokenId: "1",
  symbol: "ETH",
  name: "Ether",
  decimals: 18,
  iconUrl: "",
  networkSlug: NET,
  environment: MAINNET,
};

/** Fake `api.sync` backed by the leaf array — the backfill range fetch reads it. */
function fakeSyncApi(leaves: SyncedLeaf[]) {
  const checkpoint = "checkpoint-discovery";
  return {
    GetMeta: vi.fn(async () => ({
      checkpoint,
      chainId: 1,
      contractAddress: network.aggregatorContractAddress as string,
      treeVersion: 1,
      finalizedBlockNumber: 7,
      finalizedBlockHash: `0x${"f".repeat(64)}`,
      notesRoot: "0",
      noteCount: leaves.length,
      nullifierCount: 0,
      pendingCount: 0,
      shardCount: 0,
      shardHeight: 14,
      shardSize: 1 << 14,
    })),
    GetNotes: vi.fn(async (_chainId: number, fromIndex: number, limit = 500) => {
      const notes = leaves.slice(fromIndex, fromIndex + limit).map((note) => ({
        ...note,
        commitBlockNumber: note.commitBlockNumber ?? 7,
        commitBlockHash: note.commitBlockHash ?? `0x${"c".repeat(64)}`,
        commitTxHash: note.commitTxHash ?? `0x${"d".repeat(64)}`,
      }));
      return { checkpoint, fromIndex, notes, nextIndex: fromIndex + notes.length, total: leaves.length };
    }),
    GetNullifiers: vi.fn(),
    GetShardRoots: vi.fn(),
  };
}

async function setup(opts: { leaves: SyncedLeaf[]; nullifiers?: string[]; seedMetadata?: boolean }) {
  const storage = new MapStorage();
  if (opts.seedMetadata !== false) await storage.upsertCurrencyMetadata(new Map([["eth", ethMetadata]]));
  await storage.insertCurvyAccount({
    id: ACCOUNT,
    createdAt: accounts[0].createdAt,
    ownerAddress: accounts[0].ownerAddress,
    curvyHandle: accounts[0].curvyHandle,
  });
  // The committed logs are already synced (this is what the account lags behind).
  await storage.appendCommittedLog(
    NET,
    "leaf",
    0,
    opts.leaves.map((l) => l.noteId),
  );
  if (opts.nullifiers?.length) await storage.appendCommittedLog(NET, "nullifier", 0, opts.nullifiers);

  const config = createFakeConfig({
    storage,
    api: createFakeApi({ sync: fakeSyncApi(opts.leaves) }),
    networks: [network],
    activeNetworks: [network],
    activeAccountId: ACCOUNT,
  });
  return { storage, config };
}

const base = (extra: { treeCursorBefore: number; head: number }) => ({
  network,
  accountId: ACCOUNT,
  environment: MAINNET,
  resolveOwnership: resolver,
  deltaOwned: [],
  deltaLeaves: [],
  deltaSpentNoteIds: [],
  ...extra,
});

describe("applyAccountDiscovery", () => {
  it("backfills discovery for notes committed before the account's cursor", async () => {
    const leaves = [otherLeaf(0, 900), ownableLeaf(1), otherLeaf(2, 902)];
    const { storage, config } = await setup({ leaves });

    const res = await applyAccountDiscovery({ config, ...base({ treeCursorBefore: 3, head: 3 }) });

    expect(res.addedCount).toBe(1);
    expect(res.backfilledLeaves).toBe(3);
    const balances = await storage.getBalances(ACCOUNT, MAINNET);
    expect(balances.map((b) => b.id)).toContain(OWNED_ID.toString());
    // The account's per-network discovery cursor advances to the tree head.
    const acct = await storage.getCurvyAccountDataById(ACCOUNT);
    expect(acct.discoveryCursors?.[NET]).toBe(3);
  });

  it("does not backfill when the account is already caught up", async () => {
    const leaves = [ownableLeaf(0)];
    const { storage, config } = await setup({ leaves });
    // Pretend the account already discovered through the head.
    await storage.replaceCurvyAccountData(ACCOUNT, {
      ...(await storage.getCurvyAccountDataById(ACCOUNT)),
      discoveryCursors: { [NET]: 1 },
    });

    const res = await applyAccountDiscovery({ config, ...base({ treeCursorBefore: 1, head: 1 }) });

    expect(res.backfilledLeaves).toBe(0);
    expect(res.addedCount).toBe(0);
  });

  it("keeps a metadata-less note pending, then materializes it once metadata exists", async () => {
    const leaves = [ownableLeaf(0)];
    const { storage, config } = await setup({ leaves, seedMetadata: false });

    const first = await applyAccountDiscovery({ config, ...base({ treeCursorBefore: 1, head: 1 }) });
    expect(first.addedCount).toBe(0);
    expect(first.pendingCount).toBe(1);
    expect(await storage.getBalances(ACCOUNT, MAINNET)).toHaveLength(0);
    const acct1 = await storage.getCurvyAccountDataById(ACCOUNT);
    expect(acct1.pendingNotes?.[NET]).toHaveLength(1);
    expect(acct1.discoveryCursors?.[NET]).toBe(1); // cursor still advances — the note is tracked

    // Metadata arrives; a later sync retries the pending note (no re-scan — cursor is caught up).
    await storage.upsertCurrencyMetadata(new Map([["eth", ethMetadata]]));
    const second = await applyAccountDiscovery({ config, ...base({ treeCursorBefore: 1, head: 1 }) });
    expect(second.addedCount).toBe(1);
    expect(second.pendingCount).toBe(0);
    expect((await storage.getBalances(ACCOUNT, MAINNET)).map((b) => b.id)).toContain(OWNED_ID.toString());
    const acct2 = await storage.getCurvyAccountDataById(ACCOUNT);
    expect(acct2.pendingNotes?.[NET]).toBeUndefined();
  });

  it("never surfaces a backfilled note that was already spent (nullifier in the log)", async () => {
    const leaves = [ownableLeaf(0)];
    const { storage, config } = await setup({ leaves, nullifiers: [NULLIFIER.toString()] });

    const res = await applyAccountDiscovery({ config, ...base({ treeCursorBefore: 1, head: 1 }) });

    expect(res.addedCount).toBe(0);
    expect(await storage.getBalances(ACCOUNT, MAINNET)).toHaveLength(0);
  });
});
