import { describe, expect, it, vi } from "vitest";
import { NETWORK_ENVIRONMENT } from "@/constants/networks";
import type { OwnershipResolver } from "@/note/discoverOwnedNotes";
import type { RootVerifier, SyncedLeaf } from "@/note/notesTreeSync";
import { MerkleTree } from "@/proving/merkleTree";
import { MapStorage } from "@/storage/map-storage";
import {
  accounts,
  createFakeApi,
  createFakeConfig,
  createFakeCore,
  fakeBalanceEntry,
  fakeCurvyAccount,
  fixtureNetwork,
} from "@/test/fixtures";
import type { CurrencyMetadata } from "@/types/storage";
import { poseidonHash } from "@/utils/hash/poseidonHash";
import { getSpendWitnesses } from "./getSpendWitnesses";
import { syncNotes } from "./syncNotes";

const NET = "ethereum";
const SHARD_HEIGHT = 2;
const ACCOUNT = accounts[0].id;

const aggNetwork = fixtureNetwork({ aggregatorContractAddress: "0x00000000000000000000000000000000000000aa" });

/** Fake `api.sync` over fixed streams — the REAL apiLeafSource paginates it. */
function fakeSyncApi(leaves: SyncedLeaf[], nullifiers: string[] = []) {
  return {
    GetMeta: vi.fn(async () => ({
      lastIndexedBlock: 7,
      noteCount: leaves.length,
      nullifierCount: nullifiers.length,
      pendingCount: 0,
      chain: { root: "0", noteIndex: String(leaves.length), blockNumber: "7" },
    })),
    GetNotes: vi.fn(async (fromIndex: number, limit = 500) => {
      const notes = leaves.slice(fromIndex, fromIndex + limit);
      return { fromIndex, notes, nextIndex: fromIndex + notes.length, total: leaves.length };
    }),
    GetNullifiers: vi.fn(async (fromIndex: number, limit = 500) => {
      const page = nullifiers
        .slice(fromIndex, fromIndex + limit)
        .map((nullifier, i) => ({ index: fromIndex + i, nullifier }));
      return { fromIndex, nullifiers: page, nextIndex: fromIndex + page.length, total: nullifiers.length };
    }),
    GetShardRoots: vi.fn(),
  };
}

const bareLeaves = (n: number, from = 0): SyncedLeaf[] =>
  Array.from({ length: n }, (_, i) => ({ index: from + i, noteId: String(5000 + from + i) }));

const flatOver = (leaves: SyncedLeaf[]): MerkleTree =>
  MerkleTree.fromLeaves(
    { depth: 30 },
    leaves.map((l) => BigInt(l.noteId)),
  );

const verifierFor = (flat: MerkleTree): RootVerifier => ({
  async currentRoot() {
    return { root: flat.root(), noteIndex: flat.getCurrentIndex() };
  },
});

// An ownable note with the real id algebra (so discovery's integrity gate passes).
const OWNER_PUB: [bigint, bigint] = [3n, 4n];
const OWNER_SS = 5n;
const OWNED_ID = poseidonHash([poseidonHash([OWNER_PUB[0], OWNER_PUB[1], OWNER_SS]), 100n, 1n]);
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
  environment: NETWORK_ENVIRONMENT.MAINNET,
};

async function world(opts: {
  leaves: SyncedLeaf[];
  nullifiers?: string[];
  seedEntries?: Parameters<MapStorage["updateBalanceEntries"]>[2];
}) {
  const storage = new MapStorage();
  await storage.upsertCurrencyMetadata(new Map([["eth", ethMetadata]]));
  if (opts.seedEntries) await storage.updateBalanceEntries(ACCOUNT, NET, opts.seedEntries);
  const config = createFakeConfig({
    storage,
    api: createFakeApi({ sync: fakeSyncApi(opts.leaves, opts.nullifiers ?? []) }),
    // An active account always carries keys; the default (local-ECDH) resolver
    // reads them. A benign scanNotes claims nothing, so tests that don't inject
    // a resolver exercise tree-sync / spend-reconciliation without discovery.
    core: createFakeCore({ scanNotes: vi.fn(async () => ({ spendingPubKeys: [], spendingPrivKeys: [] })) }),
    networks: [aggNetwork],
    activeNetworks: [aggNetwork],
    activeAccountId: ACCOUNT,
    liveAccounts: new Map([[ACCOUNT, fakeCurvyAccount()]]),
  });
  return { storage, config, flat: flatOver(opts.leaves) };
}

describe("syncNotes (production action)", () => {
  it("cold-syncs via the paginated indexer API and persists the lean state", async () => {
    const leaves = bareLeaves(10);
    const { storage, config, flat } = await world({ leaves });

    const [res] = await syncNotes({
      config,
      networkSlug: NET,
      shardHeight: SHARD_HEIGHT,
      pageSize: 4,
      verifier: verifierFor(flat),
    });

    expect(res).toMatchObject({ networkSlug: NET, caughtUp: true, indexerLag: 0, leafCount: 10 });
    expect(res.root).toBe(flat.root());
    expect(config._internal.notesTrees.get(NET)?.root()).toBe(flat.root());
    expect((await storage.getShardRoots(NET)).length).toBe(2); // 10 leaves / 4-leaf shards
    expect((await storage.getNotesCheckpoint(NET, NETWORK_ENVIRONMENT.MAINNET))?.shardCount).toBe(2);
  });

  it("discovers an owned note → balance entry (with leafIndex) + receive history", async () => {
    const leaves = [...bareLeaves(1), ownableLeaf(1), ...bareLeaves(2, 2)];
    const { storage, config, flat } = await world({ leaves });

    const [res] = await syncNotes({
      config,
      networkSlug: NET,
      shardHeight: SHARD_HEIGHT,
      verifier: verifierFor(flat),
      resolveOwnership: resolver,
    });

    expect(res.newOwnedCount).toBe(1);
    const entries = await storage.getBalances(ACCOUNT);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: OWNED_ID.toString(),
      balance: 100n,
      symbol: "ETH",
      leafIndex: 1,
      networkSlug: NET,
    });

    const history = await storage.getTxHistory(ACCOUNT);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      kind: "receive",
      origin: "deposit",
      noteId: OWNED_ID.toString(),
      amount: "100",
      requestTxHash: "0xrequest",
      blockNumber: 5,
    });
  });

  it("reconciles a spend of a scan-discovered note (no witness): entry removed + spend history", async () => {
    const owner = { babyJubjubPublicKey: { x: "11", y: "12" }, sharedSecret: "13" };
    const seeded = fakeBalanceEntry({ id: "777", owner, balance: 500n });
    const nullifier = poseidonHash([13n, 11n, 12n]).toString();
    const { storage, config, flat } = await world({ leaves: [], nullifiers: [nullifier], seedEntries: [seeded] });

    const [res] = await syncNotes({ config, networkSlug: NET, shardHeight: SHARD_HEIGHT, verifier: verifierFor(flat) });

    expect(res.spentCount).toBe(1);
    expect(await storage.getBalances(ACCOUNT)).toHaveLength(0);
    const history = await storage.getTxHistory(ACCOUNT, { networkSlug: NET });
    expect(history).toEqual([expect.objectContaining({ kind: "spend", noteId: "777", amount: "500" })]);
  });

  it("re-running the same sync is idempotent (no duplicate balances or history)", async () => {
    const leaves = [ownableLeaf(0)];
    const { storage, config, flat } = await world({ leaves });
    const run = () =>
      syncNotes({
        config,
        networkSlug: NET,
        shardHeight: SHARD_HEIGHT,
        verifier: verifierFor(flat),
        resolveOwnership: resolver,
      });

    await run();
    await run(); // delta is empty the second time; effects must not duplicate
    expect(await storage.getBalances(ACCOUNT)).toHaveLength(1);
    expect(await storage.getTxHistory(ACCOUNT)).toHaveLength(1);
  });

  it("getSpendWitnesses returns proofs at one root from the synced tree", async () => {
    const leaves = [...bareLeaves(5), ownableLeaf(5), ...bareLeaves(4, 6)];
    const { config, flat } = await world({ leaves });
    await syncNotes({
      config,
      networkSlug: NET,
      shardHeight: SHARD_HEIGHT,
      verifier: verifierFor(flat),
      resolveOwnership: resolver,
    });

    const { proofs, notesRoot } = await getSpendWitnesses({ config, networkSlug: NET, noteIds: [OWNED_ID] });
    expect(notesRoot).toBe(flat.root());
    expect(proofs[0].index).toBe(5);
    expect(flat.verifyProof(proofs[0])).toBe(true);

    await expect(getSpendWitnesses({ config, networkSlug: "unknown", noteIds: [1n] })).rejects.toThrow(
      /run syncNotes first/,
    );
  });

  it("skips when a sync for the network is already in flight", async () => {
    const { config, flat } = await world({ leaves: [] });
    config._internal.scanLocks.set(`sync-notes-${NET}`, true);
    const [res] = await syncNotes({ config, networkSlug: NET, verifier: verifierFor(flat) });
    expect(res.skipped).toBe(true);
  });

  it("throws on an unknown network", async () => {
    const { config } = await world({ leaves: [] });
    await expect(syncNotes({ config, networkSlug: "nope" })).rejects.toThrow(/unknown network/);
  });

  it("is a graceful no-op (returns []) when 'sync all' finds no aggregator network", async () => {
    const config = createFakeConfig({ activeAccountId: ACCOUNT, activeNetworks: [] });
    await expect(syncNotes({ config })).resolves.toEqual([]);
  });
});

describe("syncNotes — global engine (engine: 'global')", () => {
  it("syncs the full IMT, discovers an owned note, and witnesses it at the same root", async () => {
    const leaves = [...bareLeaves(3), ownableLeaf(3), ...bareLeaves(2, 4)];
    const { storage, config, flat } = await world({ leaves });

    const [res] = await syncNotes({
      config,
      networkSlug: NET,
      engine: "global",
      verifier: verifierFor(flat),
      resolveOwnership: resolver,
    });

    expect(res).toMatchObject({ networkSlug: NET, caughtUp: true, indexerLag: 0, leafCount: 6, newOwnedCount: 1 });
    expect(res.root).toBe(flat.root());
    // The warm tree handed to the spend path is the global IMT, not a shard tree.
    expect(config._internal.notesTrees.get(NET)?.root()).toBe(flat.root());
    expect(await storage.getShardRoots(NET)).toHaveLength(0); // global engine writes no shard roots

    // Owned note → balance entry with the right leafIndex (global discovery path).
    const entries = await storage.getBalances(ACCOUNT);
    expect(entries).toMatchObject([{ id: OWNED_ID.toString(), leafIndex: 3, symbol: "ETH" }]);

    // The global tree witnesses any leaf directly — no shard recovery involved.
    const { proofs, notesRoot } = await getSpendWitnesses({ config, networkSlug: NET, noteIds: [OWNED_ID] });
    expect(notesRoot).toBe(flat.root());
    expect(proofs[0].index).toBe(3);
    expect(flat.verifyProof(proofs[0])).toBe(true);
  });

  it("reconciles a spend of a scan-discovered note under the global engine", async () => {
    const owner = { babyJubjubPublicKey: { x: "11", y: "12" }, sharedSecret: "13" };
    const seeded = fakeBalanceEntry({ id: "777", owner, balance: 500n });
    const nullifier = poseidonHash([13n, 11n, 12n]).toString();
    const { storage, config, flat } = await world({ leaves: [], nullifiers: [nullifier], seedEntries: [seeded] });

    const [res] = await syncNotes({ config, networkSlug: NET, engine: "global", verifier: verifierFor(flat) });

    expect(res.spentCount).toBe(1);
    expect(await storage.getBalances(ACCOUNT)).toHaveLength(0);
  });
});
