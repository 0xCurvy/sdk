/* tslint:disable */
/* eslint-disable */

/**
 * Rust-owned replacement for the SDK's generic `@zk-kit/imt` wrapper.
 */
export class MerkleTree {
    free(): void;
    [Symbol.dispose](): void;
    static fromLeaves(depth: number, packed_leaves: Uint8Array): MerkleTree;
    getIndex(leaf: Uint8Array): number | undefined;
    insert(leaf: Uint8Array): number;
    insertMany(packed_leaves: Uint8Array): void;
    leaves(): Uint8Array;
    constructor(depth: number);
    proof(leaf: Uint8Array): ShardedInclusionProof;
    proofAt(index: number): ShardedInclusionProof;
    root(): Uint8Array;
    truncate(leaf_count: number): void;
    readonly depth: number;
    readonly leafCount: number;
}

/**
 * Rust-owned constant-space frontier for the production indexer. It retains no
 * leaves or witnesses and emits a shard descriptor only at an exact boundary.
 */
export class NotesFrontier {
    free(): void;
    [Symbol.dispose](): void;
    append(leaf: Uint8Array): NotesFrontierAppend;
    appendMany(packed_leaves: Uint8Array): NotesFrontierCompletedShard[];
    constructor(depth: number, shard_height: number);
    static restore(snapshot: Uint8Array): NotesFrontier;
    root(): Uint8Array;
    snapshot(): Uint8Array;
    readonly depth: number;
    readonly leafCount: number;
    readonly shardHeight: number;
    readonly shardSize: number;
}

export class NotesFrontierAppend {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly completedShardIndex: number | undefined;
    readonly completedShardRoot: Uint8Array;
    readonly hasCompletedShard: boolean;
    readonly leafIndex: number;
}

export class NotesFrontierCompletedShard {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly root: Uint8Array;
    readonly shardIndex: number;
}

/**
 * Position-addressed tree for public vectors whose values may repeat.
 */
export class OrderedMerkleTree {
    free(): void;
    [Symbol.dispose](): void;
    static fromLeaves(depth: number, packed_leaves: Uint8Array): OrderedMerkleTree;
    insert(leaf: Uint8Array): number;
    insertMany(packed_leaves: Uint8Array): void;
    constructor(depth: number);
    proofAt(index: number): ShardedInclusionProof;
    root(): Uint8Array;
    readonly depth: number;
    readonly leafCount: number;
}

/**
 * One [`scan`] candidate: `index` into the input arrays + the derived keys.
 */
export class ScanMatch {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly index: number;
    readonly spendingPrivKey: string;
    readonly spendingPubKey: string;
}

export class ShardedInclusionProof {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly index: number;
    readonly leaf: Uint8Array;
    readonly root: Uint8Array;
    readonly siblings: Uint8Array;
}

/**
 * Rust-owned sharded notes tree. Field elements cross this bulk boundary as
 * canonical packed 32-byte big-endian values, avoiding one JS↔wasm call and one
 * decimal-string allocation per Poseidon node.
 */
export class ShardedNotesTree {
    free(): void;
    [Symbol.dispose](): void;
    adoptFrozenWitness(note_id: Uint8Array, leaf_index: number, packed_siblings: Uint8Array): void;
    /**
     * Append one canonical 32-byte note commitment.
     */
    append(note_id: Uint8Array): void;
    /**
     * Append `N` concatenated 32-byte note commitments in one wasm call.
     */
    appendMany(packed_note_ids: Uint8Array): void;
    completedShardRoot(shard_index: number): Uint8Array;
    completedShardRoots(): Uint8Array;
    drainDirtyOwnedNotes(): ShardedOwnedNoteWitness[];
    liveLeaves(): Uint8Array;
    markOwned(note_id: Uint8Array, leaf_index: number): void;
    constructor(depth: number, shard_height: number);
    ownedNotes(): ShardedOwnedNoteWitness[];
    /**
     * Restore a versioned snapshot previously returned by [`Self::snapshot`].
     */
    static restore(snapshot: Uint8Array): ShardedNotesTree;
    /**
     * Restore public tree state from storage tables before account-scoped
     * witnesses are marked/adopted.
     */
    static restoreParts(depth: number, shard_height: number, packed_completed_roots: Uint8Array, packed_live_leaves: Uint8Array): ShardedNotesTree;
    /**
     * Rewind only within the current live shard. Restore an earlier persisted
     * snapshot when a rollback crosses a completed-shard boundary.
     */
    rewindLiveTo(leaf_count: number): Uint8Array;
    root(): Uint8Array;
    /**
     * Deterministic versioned binary state. Storage layers should associate
     * chain/deployment/block metadata with this opaque tree blob.
     */
    snapshot(): Uint8Array;
    unmarkOwned(note_id: Uint8Array): boolean;
    witness(note_id: Uint8Array): ShardedInclusionProof;
    readonly completedShardCount: number;
    readonly depth: number;
    readonly leafCount: number;
    readonly ownedNoteCount: number;
    readonly shardHeight: number;
    readonly shardSize: number;
}

export class ShardedOwnedNoteWitness {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly frozen: boolean;
    readonly leafIndex: number;
    readonly noteId: Uint8Array;
    readonly withinShardSiblings: Uint8Array;
}

/**
 * One [`viewer_scan`] candidate: `index` + the derived spending PUBLIC key.
 */
export class ViewerMatch {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly index: number;
    readonly spendingPubKey: string;
}

export function dbg_isValidBN254Point(point: string): boolean;

export function dbg_isValidSECP256k1Point(point: string): boolean;

/**
 * Decrypt `(encryptedAmount, encryptedToken)` -> `[amount, token]`.
 */
export function decryptAmountToken(encrypted_amount: string, encrypted_token: string, shared_secret: string, ephemeral_key_x: string, ephemeral_key_y: string): string[];

/**
 * Encrypt `(amount, token)` -> `[encryptedAmount, encryptedToken]`.
 */
export function encryptAmountToken(amount: string, token: string, shared_secret: string, ephemeral_key_x: string, ephemeral_key_y: string): string[];

/**
 * Ephemeral public key `R = scalar · Base8` as `[x, y]` (`ephemeralPubKey`).
 */
export function ephemeralPubKey(scalar: string): string[];

/**
 * Public meta-keys `[k, v, K, V]` for the given private spend (`k`) / view (`v`) keys.
 * Throws on degenerate keys (zero reduction).
 */
export function get_meta(k: string, v: string): string[];

/**
 * Fresh random meta-keys `[k, v, K, V]` = spend priv, view priv, spend pub, view pub.
 */
export function new_meta(): string[];

/**
 * `id = Poseidon([ownerHash, amount, token])`.
 */
export function noteId(owner_hash: string, amount: string, token: string): string;

/**
 * `nullifier = Poseidon([sharedSecret, pub.x, pub.y])`.
 */
export function nullifier(shared_secret: string, pub_x: string, pub_y: string): string;

/**
 * `ownerHash = Poseidon([pub.x, pub.y, sharedSecret])`.
 */
export function ownerHash(pub_x: string, pub_y: string, shared_secret: string): string;

/**
 * Poseidon hash of `1..=16` decimal field elements.
 */
export function poseidon(inputs: string[]): string;

/**
 * BabyJubjub public key `[x, y]` from a hex private key (`pubFromPrivateKey`).
 */
export function pubFromPrivateKey(private_key_hex: string): string[];

/**
 * Recipient scan → the SPARSE list of tag-matching announcements, in input
 * order: each match carries its `index` into the input arrays plus the derived
 * one-time keys. Matches are CANDIDATES (1-byte viewTag ⇒ ~1/256 false
 * positives) — the caller's note-commitment recompute confirms ownership.
 * Malformed / off-curve announcements are non-matches (skipped), never fatal;
 * throws only on the caller's own inputs (keys, mismatched array lengths).
 */
export function scan(k: string, v: string, rs: string[], view_tags: string[]): ScanMatch[];

/**
 * Announce a payment to recipient `(K, V)` → `[r, R, viewTag, spendingPubKey]`.
 * Throws on malformed / off-curve recipient keys (an unspendable announcement
 * must never be produced).
 */
export function send(big_k: string, big_v: string): string[];

/**
 * `sha256BigInt`: raw 256-bit decimal inputs -> decimal digest (no field reduction).
 */
export function sha256BigInt(inputs: string[]): string;

/**
 * EdDSA-Poseidon signature `[R8.x, R8.y, S]` (`sign`).
 */
export function sign(message: string, private_key_hex: string): string[];

/**
 * Verify a packed conventional inclusion proof without reimplementing
 * Poseidon/path ordering in JavaScript.
 */
export function verifyMerkleProof(leaf: Uint8Array, index: number, packed_siblings: Uint8Array, root: Uint8Array): boolean;

export function version(): string;

/**
 * Viewer scan (view key `v` + recipient spend pub `K`, no spend key): the same
 * sparse candidate list, spending PUBLIC keys only.
 */
export function viewerScan(v: string, big_k: string, rs: string[], view_tags: string[]): ViewerMatch[];

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_merkletree_free: (a: number, b: number) => void;
    readonly __wbg_notesfrontier_free: (a: number, b: number) => void;
    readonly __wbg_notesfrontierappend_free: (a: number, b: number) => void;
    readonly __wbg_notesfrontiercompletedshard_free: (a: number, b: number) => void;
    readonly __wbg_orderedmerkletree_free: (a: number, b: number) => void;
    readonly __wbg_scanmatch_free: (a: number, b: number) => void;
    readonly __wbg_shardedinclusionproof_free: (a: number, b: number) => void;
    readonly __wbg_shardednotestree_free: (a: number, b: number) => void;
    readonly __wbg_shardedownednotewitness_free: (a: number, b: number) => void;
    readonly __wbg_viewermatch_free: (a: number, b: number) => void;
    readonly dbg_isValidBN254Point: (a: number, b: number) => number;
    readonly dbg_isValidSECP256k1Point: (a: number, b: number) => number;
    readonly decryptAmountToken: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => [number, number];
    readonly encryptAmountToken: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => [number, number];
    readonly ephemeralPubKey: (a: number, b: number) => [number, number];
    readonly get_meta: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly new_meta: () => [number, number];
    readonly noteId: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly nullifier: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly ownerHash: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly poseidon: (a: number, b: number) => [number, number];
    readonly pubFromPrivateKey: (a: number, b: number) => [number, number];
    readonly scan: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number, number];
    readonly scanmatch_index: (a: number) => number;
    readonly scanmatch_spendingPrivKey: (a: number) => [number, number];
    readonly scanmatch_spendingPubKey: (a: number) => [number, number];
    readonly send: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly sha256BigInt: (a: number, b: number) => [number, number];
    readonly sign: (a: number, b: number, c: number, d: number) => [number, number];
    readonly verifyMerkleProof: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
    readonly version: () => [number, number];
    readonly viewerScan: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number, number];
    readonly viewermatch_index: (a: number) => number;
    readonly viewermatch_spendingPubKey: (a: number) => [number, number];
    readonly wasmcompletedshard_root: (a: number) => [number, number];
    readonly wasmcompletedshard_shardIndex: (a: number) => number;
    readonly wasmfrontierappend_completedShardIndex: (a: number) => number;
    readonly wasmfrontierappend_completedShardRoot: (a: number) => [number, number];
    readonly wasmfrontierappend_hasCompletedShard: (a: number) => number;
    readonly wasmfrontierappend_leafIndex: (a: number) => number;
    readonly wasminclusionproof_index: (a: number) => number;
    readonly wasminclusionproof_leaf: (a: number) => [number, number];
    readonly wasminclusionproof_root: (a: number) => [number, number];
    readonly wasminclusionproof_siblings: (a: number) => [number, number];
    readonly wasmmerkletree_fromLeaves: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmmerkletree_getIndex: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmmerkletree_insert: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmmerkletree_insertMany: (a: number, b: number, c: number) => [number, number];
    readonly wasmmerkletree_leafCount: (a: number) => number;
    readonly wasmmerkletree_leaves: (a: number) => [number, number];
    readonly wasmmerkletree_new: (a: number) => [number, number, number];
    readonly wasmmerkletree_proof: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmmerkletree_proofAt: (a: number, b: number) => [number, number, number];
    readonly wasmmerkletree_root: (a: number) => [number, number];
    readonly wasmmerkletree_truncate: (a: number, b: number) => [number, number];
    readonly wasmnotesfrontier_append: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmnotesfrontier_appendMany: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmnotesfrontier_leafCount: (a: number) => number;
    readonly wasmnotesfrontier_new: (a: number, b: number) => [number, number, number];
    readonly wasmnotesfrontier_restore: (a: number, b: number) => [number, number, number];
    readonly wasmnotesfrontier_root: (a: number) => [number, number];
    readonly wasmnotesfrontier_shardHeight: (a: number) => number;
    readonly wasmnotesfrontier_shardSize: (a: number) => number;
    readonly wasmnotesfrontier_snapshot: (a: number) => [number, number];
    readonly wasmorderedmerkletree_fromLeaves: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmorderedmerkletree_insert: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmorderedmerkletree_insertMany: (a: number, b: number, c: number) => [number, number];
    readonly wasmorderedmerkletree_leafCount: (a: number) => number;
    readonly wasmorderedmerkletree_new: (a: number) => [number, number, number];
    readonly wasmorderedmerkletree_proofAt: (a: number, b: number) => [number, number, number];
    readonly wasmorderedmerkletree_root: (a: number) => [number, number];
    readonly wasmownednotewitness_frozen: (a: number) => number;
    readonly wasmownednotewitness_noteId: (a: number) => [number, number];
    readonly wasmownednotewitness_withinShardSiblings: (a: number) => [number, number];
    readonly wasmshardednotestree_adoptFrozenWitness: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly wasmshardednotestree_append: (a: number, b: number, c: number) => [number, number];
    readonly wasmshardednotestree_appendMany: (a: number, b: number, c: number) => [number, number];
    readonly wasmshardednotestree_completedShardCount: (a: number) => number;
    readonly wasmshardednotestree_completedShardRoot: (a: number, b: number) => [number, number, number, number];
    readonly wasmshardednotestree_completedShardRoots: (a: number) => [number, number];
    readonly wasmshardednotestree_depth: (a: number) => number;
    readonly wasmshardednotestree_drainDirtyOwnedNotes: (a: number) => [number, number];
    readonly wasmshardednotestree_leafCount: (a: number) => number;
    readonly wasmshardednotestree_liveLeaves: (a: number) => [number, number];
    readonly wasmshardednotestree_markOwned: (a: number, b: number, c: number, d: number) => [number, number];
    readonly wasmshardednotestree_new: (a: number, b: number) => [number, number, number];
    readonly wasmshardednotestree_ownedNoteCount: (a: number) => number;
    readonly wasmshardednotestree_ownedNotes: (a: number) => [number, number];
    readonly wasmshardednotestree_restore: (a: number, b: number) => [number, number, number];
    readonly wasmshardednotestree_restoreParts: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly wasmshardednotestree_rewindLiveTo: (a: number, b: number) => [number, number, number, number];
    readonly wasmshardednotestree_root: (a: number) => [number, number];
    readonly wasmshardednotestree_shardHeight: (a: number) => number;
    readonly wasmshardednotestree_shardSize: (a: number) => number;
    readonly wasmshardednotestree_snapshot: (a: number) => [number, number, number, number];
    readonly wasmshardednotestree_unmarkOwned: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmshardednotestree_witness: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmmerkletree_depth: (a: number) => number;
    readonly wasmnotesfrontier_depth: (a: number) => number;
    readonly wasmorderedmerkletree_depth: (a: number) => number;
    readonly wasmownednotewitness_leafIndex: (a: number) => number;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
