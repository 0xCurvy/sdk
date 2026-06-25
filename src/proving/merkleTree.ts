import { IMT, type IMTMerkleProof } from "@zk-kit/imt";
import { poseidon2 } from "poseidon-lite";

const ZERO_VALUE = 0;
const ARITY = 2;

export const SNARK_SCALAR_FIELD = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617",
);

const hashFn = (children: (string | number | bigint)[]) => poseidon2(children) % SNARK_SCALAR_FIELD;

export type MerkleTreeParams = {
  depth: number;
};

export type InclusionProof = {
  siblings: bigint[];
  index: number;
  leaf: bigint;
  root: bigint;
};

export class MerkleTree {
  private tree: IMT;
  private reverseIndex: Map<bigint, number> = new Map();
  private currentIndex: number = 0;

  constructor({ depth }: MerkleTreeParams) {
    this.tree = new IMT(hashFn, depth, ZERO_VALUE, ARITY);
  }

  /**
   * Bulk-build a tree from an ordered leaf log (e.g. the on-chain CommittedNotes
   * stream during sync). The IMT constructor builds bottom-up in O(n) hashes,
   * vs O(n·depth) for insert-per-leaf — the difference between seconds and
   * minutes when cold-rebuilding a large tree client-side.
   */
  static fromLeaves({ depth }: MerkleTreeParams, leaves: bigint[]): MerkleTree {
    const tree = new MerkleTree({ depth });
    if (leaves.length === 0) return tree;
    leaves.forEach((leaf, index) => {
      if (tree.reverseIndex.has(leaf)) throw new Error(`Leaf ${leaf} already exists in the tree`);
      tree.reverseIndex.set(leaf, index);
    });
    // Copy: the IMT constructor ADOPTS the array as its internal leaf level
    // (`_nodes[0] = leaves`) and appends into it on insert — aliasing the
    // caller's array corrupts both sides.
    tree.tree = new IMT(hashFn, depth, ZERO_VALUE, ARITY, [...leaves]);
    tree.currentIndex = leaves.length;
    return tree;
  }

  insert(value: bigint): void {
    if (this.reverseIndex.has(value)) {
      throw new Error(`Leaf ${value} already exists in the tree`);
    }
    this.reverseIndex.set(value, this.currentIndex);
    this.tree.insert(value);
    this.currentIndex++;
  }

  insertMany(values: bigint[]): void {
    values.forEach((value) => {
      this.insert(value);
    });
  }

  root(): bigint {
    return BigInt(this.tree.root);
  }

  getIndex(value: bigint): number | null {
    const idx = this.reverseIndex.get(value);
    return idx === undefined ? null : idx;
  }

  createInclusionProof(value: bigint): InclusionProof {
    const index = this.getIndex(value);
    if (index === null) {
      throw new Error(`Leaf ${value} not found in the tree`);
    }
    const rawProof = this.tree.createProof(index);
    return {
      siblings: rawProof.siblings.map((sib) => BigInt(sib[0])),
      index,
      leaf: value,
      root: this.root(),
    };
  }

  private computePathIndices(index: number, depth: number): number[] {
    const indices: number[] = [];
    let i = index;
    for (let d = 0; d < depth; d++) {
      indices.push(i % 2);
      i = Math.floor(i / 2);
    }
    return indices;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  verifyProof(proof: InclusionProof): boolean {
    const { siblings, leaf, index, root } = proof;
    const pathIndices = this.computePathIndices(index, this.tree.depth);
    return this.tree.verifyProof({
      siblings: siblings.map((sib) => [sib]),
      leaf,
      pathIndices,
      root,
    } as IMTMerkleProof);
  }
}
