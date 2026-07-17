// AUTO-GENERATED from packages/core-rs (build-wasm-threads.sh + sync-threads-to-sdk.mjs). Do not edit.
/* @ts-self-types="./curvy_wasm.d.ts" */
import { startWorkers } from './snippets/wasm-bindgen-rayon-38edf6e439f6d70d/src/workerHelpers.js';

/**
 * Rust-owned replacement for the SDK's generic `@zk-kit/imt` wrapper.
 */
export class MerkleTree {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(MerkleTree.prototype);
        obj.__wbg_ptr = ptr;
        MerkleTreeFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MerkleTreeFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_merkletree_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get depth() {
        const ret = wasm.wasmmerkletree_depth(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} depth
     * @param {Uint8Array} packed_leaves
     * @returns {MerkleTree}
     */
    static fromLeaves(depth, packed_leaves) {
        const ptr0 = passArray8ToWasm0(packed_leaves, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmmerkletree_fromLeaves(depth, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return MerkleTree.__wrap(ret[0]);
    }
    /**
     * @param {Uint8Array} leaf
     * @returns {number | undefined}
     */
    getIndex(leaf) {
        const ptr0 = passArray8ToWasm0(leaf, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmmerkletree_getIndex(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] === 0x100000001 ? undefined : ret[0];
    }
    /**
     * @param {Uint8Array} leaf
     * @returns {number}
     */
    insert(leaf) {
        const ptr0 = passArray8ToWasm0(leaf, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmmerkletree_insert(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] >>> 0;
    }
    /**
     * @param {Uint8Array} packed_leaves
     */
    insertMany(packed_leaves) {
        const ptr0 = passArray8ToWasm0(packed_leaves, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmmerkletree_insertMany(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {number}
     */
    get leafCount() {
        const ret = wasm.wasmmerkletree_leafCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Uint8Array}
     */
    leaves() {
        const ret = wasm.wasmmerkletree_leaves(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @param {number} depth
     */
    constructor(depth) {
        const ret = wasm.wasmmerkletree_new(depth);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        MerkleTreeFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {Uint8Array} leaf
     * @returns {ShardedInclusionProof}
     */
    proof(leaf) {
        const ptr0 = passArray8ToWasm0(leaf, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmmerkletree_proof(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ShardedInclusionProof.__wrap(ret[0]);
    }
    /**
     * @param {number} index
     * @returns {ShardedInclusionProof}
     */
    proofAt(index) {
        const ret = wasm.wasmmerkletree_proofAt(this.__wbg_ptr, index);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ShardedInclusionProof.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    root() {
        const ret = wasm.wasmmerkletree_root(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @param {number} leaf_count
     */
    truncate(leaf_count) {
        const ret = wasm.wasmmerkletree_truncate(this.__wbg_ptr, leaf_count);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
}
if (Symbol.dispose) MerkleTree.prototype[Symbol.dispose] = MerkleTree.prototype.free;

/**
 * Rust-owned constant-space frontier for the production indexer. It retains no
 * leaves or witnesses and emits a shard descriptor only at an exact boundary.
 */
export class NotesFrontier {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NotesFrontier.prototype);
        obj.__wbg_ptr = ptr;
        NotesFrontierFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NotesFrontierFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_notesfrontier_free(ptr, 0);
    }
    /**
     * @param {Uint8Array} leaf
     * @returns {NotesFrontierAppend}
     */
    append(leaf) {
        const ptr0 = passArray8ToWasm0(leaf, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmnotesfrontier_append(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return NotesFrontierAppend.__wrap(ret[0]);
    }
    /**
     * @param {Uint8Array} packed_leaves
     * @returns {NotesFrontierCompletedShard[]}
     */
    appendMany(packed_leaves) {
        const ptr0 = passArray8ToWasm0(packed_leaves, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmnotesfrontier_appendMany(this.__wbg_ptr, ptr0, len0);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v2;
    }
    /**
     * @returns {number}
     */
    get depth() {
        const ret = wasm.wasmnotesfrontier_depth(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get leafCount() {
        const ret = wasm.wasmnotesfrontier_leafCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} depth
     * @param {number} shard_height
     */
    constructor(depth, shard_height) {
        const ret = wasm.wasmnotesfrontier_new(depth, shard_height);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        NotesFrontierFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {Uint8Array} snapshot
     * @returns {NotesFrontier}
     */
    static restore(snapshot) {
        const ptr0 = passArray8ToWasm0(snapshot, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmnotesfrontier_restore(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return NotesFrontier.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    root() {
        const ret = wasm.wasmnotesfrontier_root(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {number}
     */
    get shardHeight() {
        const ret = wasm.wasmnotesfrontier_shardHeight(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get shardSize() {
        const ret = wasm.wasmnotesfrontier_shardSize(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Uint8Array}
     */
    snapshot() {
        const ret = wasm.wasmnotesfrontier_snapshot(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) NotesFrontier.prototype[Symbol.dispose] = NotesFrontier.prototype.free;

export class NotesFrontierAppend {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NotesFrontierAppend.prototype);
        obj.__wbg_ptr = ptr;
        NotesFrontierAppendFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NotesFrontierAppendFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_notesfrontierappend_free(ptr, 0);
    }
    /**
     * @returns {number | undefined}
     */
    get completedShardIndex() {
        const ret = wasm.wasmfrontierappend_completedShardIndex(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * @returns {Uint8Array}
     */
    get completedShardRoot() {
        const ret = wasm.wasmfrontierappend_completedShardRoot(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {boolean}
     */
    get hasCompletedShard() {
        const ret = wasm.wasmfrontierappend_hasCompletedShard(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get leafIndex() {
        const ret = wasm.wasmfrontierappend_leafIndex(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) NotesFrontierAppend.prototype[Symbol.dispose] = NotesFrontierAppend.prototype.free;

export class NotesFrontierCompletedShard {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NotesFrontierCompletedShard.prototype);
        obj.__wbg_ptr = ptr;
        NotesFrontierCompletedShardFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NotesFrontierCompletedShardFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_notesfrontiercompletedshard_free(ptr, 0);
    }
    /**
     * @returns {Uint8Array}
     */
    get root() {
        const ret = wasm.wasmcompletedshard_root(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {number}
     */
    get shardIndex() {
        const ret = wasm.wasmcompletedshard_shardIndex(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) NotesFrontierCompletedShard.prototype[Symbol.dispose] = NotesFrontierCompletedShard.prototype.free;

/**
 * Position-addressed tree for public vectors whose values may repeat.
 */
export class OrderedMerkleTree {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(OrderedMerkleTree.prototype);
        obj.__wbg_ptr = ptr;
        OrderedMerkleTreeFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OrderedMerkleTreeFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_orderedmerkletree_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get depth() {
        const ret = wasm.wasmorderedmerkletree_depth(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} depth
     * @param {Uint8Array} packed_leaves
     * @returns {OrderedMerkleTree}
     */
    static fromLeaves(depth, packed_leaves) {
        const ptr0 = passArray8ToWasm0(packed_leaves, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmorderedmerkletree_fromLeaves(depth, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return OrderedMerkleTree.__wrap(ret[0]);
    }
    /**
     * @param {Uint8Array} leaf
     * @returns {number}
     */
    insert(leaf) {
        const ptr0 = passArray8ToWasm0(leaf, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmorderedmerkletree_insert(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] >>> 0;
    }
    /**
     * @param {Uint8Array} packed_leaves
     */
    insertMany(packed_leaves) {
        const ptr0 = passArray8ToWasm0(packed_leaves, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmorderedmerkletree_insertMany(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {number}
     */
    get leafCount() {
        const ret = wasm.wasmorderedmerkletree_leafCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} depth
     */
    constructor(depth) {
        const ret = wasm.wasmorderedmerkletree_new(depth);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        OrderedMerkleTreeFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} index
     * @returns {ShardedInclusionProof}
     */
    proofAt(index) {
        const ret = wasm.wasmorderedmerkletree_proofAt(this.__wbg_ptr, index);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ShardedInclusionProof.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    root() {
        const ret = wasm.wasmorderedmerkletree_root(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) OrderedMerkleTree.prototype[Symbol.dispose] = OrderedMerkleTree.prototype.free;

/**
 * One [`scan`] candidate: `index` into the input arrays + the derived keys.
 */
export class ScanMatch {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ScanMatch.prototype);
        obj.__wbg_ptr = ptr;
        ScanMatchFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ScanMatchFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_scanmatch_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get index() {
        const ret = wasm.scanmatch_index(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {string}
     */
    get spendingPrivKey() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.scanmatch_spendingPrivKey(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get spendingPubKey() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.scanmatch_spendingPubKey(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) ScanMatch.prototype[Symbol.dispose] = ScanMatch.prototype.free;

export class ShardedInclusionProof {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ShardedInclusionProof.prototype);
        obj.__wbg_ptr = ptr;
        ShardedInclusionProofFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ShardedInclusionProofFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_shardedinclusionproof_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get index() {
        const ret = wasm.wasminclusionproof_index(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Uint8Array}
     */
    get leaf() {
        const ret = wasm.wasminclusionproof_leaf(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    get root() {
        const ret = wasm.wasminclusionproof_root(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    get siblings() {
        const ret = wasm.wasminclusionproof_siblings(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) ShardedInclusionProof.prototype[Symbol.dispose] = ShardedInclusionProof.prototype.free;

/**
 * Rust-owned sharded notes tree. Field elements cross this bulk boundary as
 * canonical packed 32-byte big-endian values, avoiding one JS↔wasm call and one
 * decimal-string allocation per Poseidon node.
 */
export class ShardedNotesTree {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ShardedNotesTree.prototype);
        obj.__wbg_ptr = ptr;
        ShardedNotesTreeFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ShardedNotesTreeFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_shardednotestree_free(ptr, 0);
    }
    /**
     * @param {Uint8Array} note_id
     * @param {number} leaf_index
     * @param {Uint8Array} packed_siblings
     */
    adoptFrozenWitness(note_id, leaf_index, packed_siblings) {
        const ptr0 = passArray8ToWasm0(note_id, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(packed_siblings, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmshardednotestree_adoptFrozenWitness(this.__wbg_ptr, ptr0, len0, leaf_index, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Append one canonical 32-byte note commitment.
     * @param {Uint8Array} note_id
     */
    append(note_id) {
        const ptr0 = passArray8ToWasm0(note_id, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmshardednotestree_append(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Append `N` concatenated 32-byte note commitments in one wasm call.
     * @param {Uint8Array} packed_note_ids
     */
    appendMany(packed_note_ids) {
        const ptr0 = passArray8ToWasm0(packed_note_ids, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmshardednotestree_appendMany(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {number}
     */
    get completedShardCount() {
        const ret = wasm.wasmshardednotestree_completedShardCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} shard_index
     * @returns {Uint8Array}
     */
    completedShardRoot(shard_index) {
        const ret = wasm.wasmshardednotestree_completedShardRoot(this.__wbg_ptr, shard_index);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    completedShardRoots() {
        const ret = wasm.wasmshardednotestree_completedShardRoots(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {number}
     */
    get depth() {
        const ret = wasm.wasmshardednotestree_depth(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {ShardedOwnedNoteWitness[]}
     */
    drainDirtyOwnedNotes() {
        const ret = wasm.wasmshardednotestree_drainDirtyOwnedNotes(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    get leafCount() {
        const ret = wasm.wasmshardednotestree_leafCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Uint8Array}
     */
    liveLeaves() {
        const ret = wasm.wasmshardednotestree_liveLeaves(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @param {Uint8Array} note_id
     * @param {number} leaf_index
     */
    markOwned(note_id, leaf_index) {
        const ptr0 = passArray8ToWasm0(note_id, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmshardednotestree_markOwned(this.__wbg_ptr, ptr0, len0, leaf_index);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {number} depth
     * @param {number} shard_height
     */
    constructor(depth, shard_height) {
        const ret = wasm.wasmshardednotestree_new(depth, shard_height);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        ShardedNotesTreeFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    get ownedNoteCount() {
        const ret = wasm.wasmshardednotestree_ownedNoteCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {ShardedOwnedNoteWitness[]}
     */
    ownedNotes() {
        const ret = wasm.wasmshardednotestree_ownedNotes(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Restore a versioned snapshot previously returned by [`Self::snapshot`].
     * @param {Uint8Array} snapshot
     * @returns {ShardedNotesTree}
     */
    static restore(snapshot) {
        const ptr0 = passArray8ToWasm0(snapshot, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmshardednotestree_restore(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ShardedNotesTree.__wrap(ret[0]);
    }
    /**
     * Restore public tree state from storage tables before account-scoped
     * witnesses are marked/adopted.
     * @param {number} depth
     * @param {number} shard_height
     * @param {Uint8Array} packed_completed_roots
     * @param {Uint8Array} packed_live_leaves
     * @returns {ShardedNotesTree}
     */
    static restoreParts(depth, shard_height, packed_completed_roots, packed_live_leaves) {
        const ptr0 = passArray8ToWasm0(packed_completed_roots, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(packed_live_leaves, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmshardednotestree_restoreParts(depth, shard_height, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ShardedNotesTree.__wrap(ret[0]);
    }
    /**
     * Rewind only within the current live shard. Restore an earlier persisted
     * snapshot when a rollback crosses a completed-shard boundary.
     * @param {number} leaf_count
     * @returns {Uint8Array}
     */
    rewindLiveTo(leaf_count) {
        const ret = wasm.wasmshardednotestree_rewindLiveTo(this.__wbg_ptr, leaf_count);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    root() {
        const ret = wasm.wasmshardednotestree_root(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {number}
     */
    get shardHeight() {
        const ret = wasm.wasmshardednotestree_shardHeight(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get shardSize() {
        const ret = wasm.wasmshardednotestree_shardSize(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Deterministic versioned binary state. Storage layers should associate
     * chain/deployment/block metadata with this opaque tree blob.
     * @returns {Uint8Array}
     */
    snapshot() {
        const ret = wasm.wasmshardednotestree_snapshot(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @param {Uint8Array} note_id
     * @returns {boolean}
     */
    unmarkOwned(note_id) {
        const ptr0 = passArray8ToWasm0(note_id, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmshardednotestree_unmarkOwned(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * @param {Uint8Array} note_id
     * @returns {ShardedInclusionProof}
     */
    witness(note_id) {
        const ptr0 = passArray8ToWasm0(note_id, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmshardednotestree_witness(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ShardedInclusionProof.__wrap(ret[0]);
    }
}
if (Symbol.dispose) ShardedNotesTree.prototype[Symbol.dispose] = ShardedNotesTree.prototype.free;

export class ShardedOwnedNoteWitness {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ShardedOwnedNoteWitness.prototype);
        obj.__wbg_ptr = ptr;
        ShardedOwnedNoteWitnessFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ShardedOwnedNoteWitnessFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_shardedownednotewitness_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get frozen() {
        const ret = wasm.wasmownednotewitness_frozen(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get leafIndex() {
        const ret = wasm.wasmownednotewitness_leafIndex(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Uint8Array}
     */
    get noteId() {
        const ret = wasm.wasmownednotewitness_noteId(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    get withinShardSiblings() {
        const ret = wasm.wasmownednotewitness_withinShardSiblings(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) ShardedOwnedNoteWitness.prototype[Symbol.dispose] = ShardedOwnedNoteWitness.prototype.free;

/**
 * One [`viewer_scan`] candidate: `index` + the derived spending PUBLIC key.
 */
export class ViewerMatch {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ViewerMatch.prototype);
        obj.__wbg_ptr = ptr;
        ViewerMatchFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ViewerMatchFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_viewermatch_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get index() {
        const ret = wasm.viewermatch_index(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {string}
     */
    get spendingPubKey() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.viewermatch_spendingPubKey(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) ViewerMatch.prototype[Symbol.dispose] = ViewerMatch.prototype.free;

/**
 * @param {string} point
 * @returns {boolean}
 */
export function dbg_isValidBN254Point(point) {
    const ptr0 = passStringToWasm0(point, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.dbg_isValidBN254Point(ptr0, len0);
    return ret !== 0;
}

/**
 * @param {string} point
 * @returns {boolean}
 */
export function dbg_isValidSECP256k1Point(point) {
    const ptr0 = passStringToWasm0(point, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.dbg_isValidSECP256k1Point(ptr0, len0);
    return ret !== 0;
}

/**
 * Decrypt `(encryptedAmount, encryptedToken)` -> `[amount, token]`.
 * @param {string} encrypted_amount
 * @param {string} encrypted_token
 * @param {string} shared_secret
 * @param {string} ephemeral_key_x
 * @param {string} ephemeral_key_y
 * @returns {string[]}
 */
export function decryptAmountToken(encrypted_amount, encrypted_token, shared_secret, ephemeral_key_x, ephemeral_key_y) {
    const ptr0 = passStringToWasm0(encrypted_amount, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(encrypted_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(shared_secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passStringToWasm0(ephemeral_key_x, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len3 = WASM_VECTOR_LEN;
    const ptr4 = passStringToWasm0(ephemeral_key_y, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len4 = WASM_VECTOR_LEN;
    const ret = wasm.decryptAmountToken(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4);
    var v6 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v6;
}

/**
 * Encrypt `(amount, token)` -> `[encryptedAmount, encryptedToken]`.
 * @param {string} amount
 * @param {string} token
 * @param {string} shared_secret
 * @param {string} ephemeral_key_x
 * @param {string} ephemeral_key_y
 * @returns {string[]}
 */
export function encryptAmountToken(amount, token, shared_secret, ephemeral_key_x, ephemeral_key_y) {
    const ptr0 = passStringToWasm0(amount, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(shared_secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passStringToWasm0(ephemeral_key_x, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len3 = WASM_VECTOR_LEN;
    const ptr4 = passStringToWasm0(ephemeral_key_y, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len4 = WASM_VECTOR_LEN;
    const ret = wasm.encryptAmountToken(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4);
    var v6 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v6;
}

/**
 * Ephemeral public key `R = scalar · Base8` as `[x, y]` (`ephemeralPubKey`).
 * @param {string} scalar
 * @returns {string[]}
 */
export function ephemeralPubKey(scalar) {
    const ptr0 = passStringToWasm0(scalar, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ephemeralPubKey(ptr0, len0);
    var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Public meta-keys `[k, v, K, V]` for the given private spend (`k`) / view (`v`) keys.
 * Throws on degenerate keys (zero reduction).
 * @param {string} k
 * @param {string} v
 * @returns {string[]}
 */
export function get_meta(k, v) {
    const ptr0 = passStringToWasm0(k, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(v, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.get_meta(ptr0, len0, ptr1, len1);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v3 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

/**
 * @param {number} num_threads
 * @returns {Promise<any>}
 */
export function initThreadPool(num_threads) {
    const ret = wasm.initThreadPool(num_threads);
    return ret;
}

/**
 * Fresh random meta-keys `[k, v, K, V]` = spend priv, view priv, spend pub, view pub.
 * @returns {string[]}
 */
export function new_meta() {
    const ret = wasm.new_meta();
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * `id = Poseidon([ownerHash, amount, token])`.
 * @param {string} owner_hash
 * @param {string} amount
 * @param {string} token
 * @returns {string}
 */
export function noteId(owner_hash, amount, token) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(owner_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(amount, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.noteId(ptr0, len0, ptr1, len1, ptr2, len2);
        deferred4_0 = ret[0];
        deferred4_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}

/**
 * `nullifier = Poseidon([sharedSecret, pub.x, pub.y])`.
 * @param {string} shared_secret
 * @param {string} pub_x
 * @param {string} pub_y
 * @returns {string}
 */
export function nullifier(shared_secret, pub_x, pub_y) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(shared_secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(pub_x, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(pub_y, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.nullifier(ptr0, len0, ptr1, len1, ptr2, len2);
        deferred4_0 = ret[0];
        deferred4_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}

/**
 * `ownerHash = Poseidon([pub.x, pub.y, sharedSecret])`.
 * @param {string} pub_x
 * @param {string} pub_y
 * @param {string} shared_secret
 * @returns {string}
 */
export function ownerHash(pub_x, pub_y, shared_secret) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(pub_x, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(pub_y, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(shared_secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.ownerHash(ptr0, len0, ptr1, len1, ptr2, len2);
        deferred4_0 = ret[0];
        deferred4_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}

/**
 * Poseidon hash of `1..=16` decimal field elements.
 * @param {string[]} inputs
 * @returns {string}
 */
export function poseidon(inputs) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passArrayJsValueToWasm0(inputs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.poseidon(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * BabyJubjub public key `[x, y]` from a hex private key (`pubFromPrivateKey`).
 * @param {string} private_key_hex
 * @returns {string[]}
 */
export function pubFromPrivateKey(private_key_hex) {
    const ptr0 = passStringToWasm0(private_key_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.pubFromPrivateKey(ptr0, len0);
    var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Recipient scan → the SPARSE list of tag-matching announcements, in input
 * order: each match carries its `index` into the input arrays plus the derived
 * one-time keys. Matches are CANDIDATES (1-byte viewTag ⇒ ~1/256 false
 * positives) — the caller's note-commitment recompute confirms ownership.
 * Malformed / off-curve announcements are non-matches (skipped), never fatal;
 * throws only on the caller's own inputs (keys, mismatched array lengths).
 * @param {string} k
 * @param {string} v
 * @param {string[]} rs
 * @param {string[]} view_tags
 * @returns {ScanMatch[]}
 */
export function scan(k, v, rs, view_tags) {
    const ptr0 = passStringToWasm0(k, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(v, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayJsValueToWasm0(rs, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArrayJsValueToWasm0(view_tags, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.scan(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v5 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v5;
}

/**
 * Announce a payment to recipient `(K, V)` → `[r, R, viewTag, spendingPubKey]`.
 * Throws on malformed / off-curve recipient keys (an unspendable announcement
 * must never be produced).
 * @param {string} big_k
 * @param {string} big_v
 * @returns {string[]}
 */
export function send(big_k, big_v) {
    const ptr0 = passStringToWasm0(big_k, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(big_v, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.send(ptr0, len0, ptr1, len1);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v3 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

/**
 * `sha256BigInt`: raw 256-bit decimal inputs -> decimal digest (no field reduction).
 * @param {string[]} inputs
 * @returns {string}
 */
export function sha256BigInt(inputs) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passArrayJsValueToWasm0(inputs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.sha256BigInt(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * EdDSA-Poseidon signature `[R8.x, R8.y, S]` (`sign`).
 * @param {string} message
 * @param {string} private_key_hex
 * @returns {string[]}
 */
export function sign(message, private_key_hex) {
    const ptr0 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(private_key_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.sign(ptr0, len0, ptr1, len1);
    var v3 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

/**
 * Verify a packed conventional inclusion proof without reimplementing
 * Poseidon/path ordering in JavaScript.
 * @param {Uint8Array} leaf
 * @param {number} index
 * @param {Uint8Array} packed_siblings
 * @param {Uint8Array} root
 * @returns {boolean}
 */
export function verifyMerkleProof(leaf, index, packed_siblings, root) {
    const ptr0 = passArray8ToWasm0(leaf, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(packed_siblings, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(root, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.verifyMerkleProof(ptr0, len0, index, ptr1, len1, ptr2, len2);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
}

/**
 * @returns {string}
 */
export function version() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.version();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Viewer scan (view key `v` + recipient spend pub `K`, no spend key): the same
 * sparse candidate list, spending PUBLIC keys only.
 * @param {string} v
 * @param {string} big_k
 * @param {string[]} rs
 * @param {string[]} view_tags
 * @returns {ViewerMatch[]}
 */
export function viewerScan(v, big_k, rs, view_tags) {
    const ptr0 = passStringToWasm0(v, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(big_k, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayJsValueToWasm0(rs, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArrayJsValueToWasm0(view_tags, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.viewerScan(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v5 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v5;
}

export class wbg_rayon_PoolBuilder {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(wbg_rayon_PoolBuilder.prototype);
        obj.__wbg_ptr = ptr;
        wbg_rayon_PoolBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        wbg_rayon_PoolBuilderFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wbg_rayon_poolbuilder_free(ptr, 0);
    }
    build() {
        wasm.wbg_rayon_poolbuilder_build(this.__wbg_ptr);
    }
    /**
     * @returns {number}
     */
    numThreads() {
        const ret = wasm.wbg_rayon_poolbuilder_numThreads(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    receiver() {
        const ret = wasm.wbg_rayon_poolbuilder_receiver(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) wbg_rayon_PoolBuilder.prototype[Symbol.dispose] = wbg_rayon_PoolBuilder.prototype.free;

/**
 * @param {number} receiver
 */
export function wbg_rayon_start_worker(receiver) {
    wasm.wbg_rayon_start_worker(receiver);
}

function __wbg_get_imports(memory) {
    const import0 = {
        __proto__: null,
        __wbg_Error_83742b46f01ce22d: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___wbindgen_is_function_3c846841762788c1: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_object_781bc9f159099513: function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_7ef6b97b02428fae: function(arg0) {
            const ret = typeof(arg0) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_52709e72fb9f179c: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_memory_edb3f01e3930bbf6: function() {
            const ret = wasm.memory;
            return ret;
        },
        __wbg___wbindgen_module_bf945c07123bafe2: function() {
            const ret = wasmModule;
            return ret;
        },
        __wbg___wbindgen_string_get_395e606bd0ee4427: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_6ddd609b62940d55: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_call_2d781c1f4d5c0ef8: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_crypto_48300657fced39f9: function(arg0) {
            const ret = arg0.crypto;
            return ret;
        },
        __wbg_getRandomValues_263d0aa5464054ee: function() { return handleError(function (arg0, arg1) {
            arg0.getRandomValues(arg1);
        }, arguments); },
        __wbg_instanceof_Window_23e677d2c6843922: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Window;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_length_ea16607d7b61445b: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_msCrypto_8c6d45a75ef1d3da: function(arg0) {
            const ret = arg0.msCrypto;
            return ret;
        },
        __wbg_new_with_length_825018a1616e9e55: function(arg0) {
            const ret = new Uint8Array(arg0 >>> 0);
            return ret;
        },
        __wbg_node_95beb7570492fd97: function(arg0) {
            const ret = arg0.node;
            return ret;
        },
        __wbg_notesfrontiercompletedshard_new: function(arg0) {
            const ret = NotesFrontierCompletedShard.__wrap(arg0);
            return ret;
        },
        __wbg_process_b2fea42461d03994: function(arg0) {
            const ret = arg0.process;
            return ret;
        },
        __wbg_prototypesetcall_d62e5099504357e6: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
        },
        __wbg_randomFillSync_ca9f178fb14c88cb: function() { return handleError(function (arg0, arg1) {
            arg0.randomFillSync(arg1);
        }, arguments); },
        __wbg_require_7a9419e39d796c95: function() { return handleError(function () {
            const ret = module.require;
            return ret;
        }, arguments); },
        __wbg_scanmatch_new: function(arg0) {
            const ret = ScanMatch.__wrap(arg0);
            return ret;
        },
        __wbg_shardedownednotewitness_new: function(arg0) {
            const ret = ShardedOwnedNoteWitness.__wrap(arg0);
            return ret;
        },
        __wbg_startWorkers_8b582d57e92bd2d4: function(arg0, arg1, arg2) {
            const ret = startWorkers(arg0, arg1, wbg_rayon_PoolBuilder.__wrap(arg2));
            return ret;
        },
        __wbg_static_accessor_GLOBAL_8adb955bd33fac2f: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_ad356e0db91c7913: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_f207c857566db248: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_bb9f1ba69d61b386: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_subarray_a068d24e39478a8a: function(arg0, arg1, arg2) {
            const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
            return ret;
        },
        __wbg_versions_215a3ab1c9d5745a: function(arg0) {
            const ret = arg0.versions;
            return ret;
        },
        __wbg_viewermatch_new: function(arg0) {
            const ret = ViewerMatch.__wrap(arg0);
            return ret;
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
            const ret = getArrayU8FromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
        memory: memory || new WebAssembly.Memory({initial:34,maximum:32768,shared:true}),
    };
    return {
        __proto__: null,
        "./curvy_wasm_bg.js": import0,
    };
}

const ScanMatchFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_scanmatch_free(ptr >>> 0, 1));
const ViewerMatchFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_viewermatch_free(ptr >>> 0, 1));
const NotesFrontierCompletedShardFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_notesfrontiercompletedshard_free(ptr >>> 0, 1));
const NotesFrontierAppendFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_notesfrontierappend_free(ptr >>> 0, 1));
const ShardedInclusionProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_shardedinclusionproof_free(ptr >>> 0, 1));
const MerkleTreeFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_merkletree_free(ptr >>> 0, 1));
const NotesFrontierFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_notesfrontier_free(ptr >>> 0, 1));
const OrderedMerkleTreeFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_orderedmerkletree_free(ptr >>> 0, 1));
const ShardedOwnedNoteWitnessFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_shardedownednotewitness_free(ptr >>> 0, 1));
const ShardedNotesTreeFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_shardednotestree_free(ptr >>> 0, 1));
const wbg_rayon_PoolBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wbg_rayon_poolbuilder_free(ptr >>> 0, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer !== wasm.memory.buffer) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.buffer !== wasm.memory.buffer) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : undefined);
if (cachedTextDecoder) cachedTextDecoder.decode();

const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().slice(ptr, ptr + len));
}

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder() : undefined);

if (cachedTextEncoder) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module, thread_stack_size) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    if (typeof thread_stack_size !== 'undefined' && (typeof thread_stack_size !== 'number' || thread_stack_size === 0 || thread_stack_size % 65536 !== 0)) {
        throw new Error('invalid stack size');
    }

    wasm.__wbindgen_start(thread_stack_size);
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module, memory) {
    if (wasm !== undefined) return wasm;

    let thread_stack_size
    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module, memory, thread_stack_size} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports(memory);
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module, thread_stack_size);
}

async function __wbg_init(module_or_path, memory) {
    if (wasm !== undefined) return wasm;

    let thread_stack_size
    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path, memory, thread_stack_size} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = undefined;
    }
    const imports = __wbg_get_imports(memory);

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module, thread_stack_size);
}

export { initSync, __wbg_init as default };
