import {
  bytesToField,
  bytesToFields,
  createRustMerkleTree,
  createRustMerkleTreeFromLeaves,
  createRustOrderedMerkleTreeFromLeaves,
  fieldsToBytes,
  fieldToBytes,
  type RustMerkleTree,
  type RustOrderedMerkleTree,
  verifyRustMerkleProof,
} from "./rustCore";

export const SNARK_SCALAR_FIELD = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617",
);

export type MerkleTreeParams = {
  depth: number;
};

export type InclusionProof = {
  siblings: bigint[];
  index: number;
  leaf: bigint;
  root: bigint;
};

type TreeBinding = RustMerkleTree | RustOrderedMerkleTree;

const unpackProof = (proof: ReturnType<RustMerkleTree["proofAt"]>): InclusionProof => {
  const unpacked = {
    siblings: bytesToFields(proof.siblings),
    index: proof.index,
    leaf: bytesToField(proof.leaf),
    root: bytesToField(proof.root),
  };
  proof.free();
  return unpacked;
};

/** Rust-backed depth-N binary Poseidon tree with the SDK's stable wrapper API. */
export class MerkleTree {
  private tree: TreeBinding;
  private ordered: boolean;

  constructor({ depth }: MerkleTreeParams) {
    this.tree = createRustMerkleTree(depth);
    this.ordered = false;
  }

  /** Bulk-build a value-indexed note tree and reject duplicate commitments. */
  static fromLeaves({ depth }: MerkleTreeParams, leaves: bigint[]): MerkleTree {
    const tree = new MerkleTree({ depth });
    tree.tree.free();
    tree.tree = createRustMerkleTreeFromLeaves(depth, leaves);
    return tree;
  }

  /** Bulk-build a position-addressed public vector whose values may repeat. */
  static fromOrderedLeaves({ depth }: MerkleTreeParams, leaves: bigint[]): MerkleTree {
    const tree = new MerkleTree({ depth });
    tree.tree.free();
    tree.tree = createRustOrderedMerkleTreeFromLeaves(depth, leaves);
    tree.ordered = true;
    return tree;
  }

  createInclusionProofAtIndex(index: number): InclusionProof {
    return unpackProof(this.tree.proofAt(index));
  }

  insert(value: bigint): void {
    this.tree.insert(fieldToBytes(value));
  }

  insertMany(values: bigint[]): void {
    if (values.length > 0) this.tree.insertMany(fieldsToBytes(values));
  }

  root(): bigint {
    return bytesToField(this.tree.root());
  }

  getIndex(value: bigint): number | null {
    if (this.ordered) return null;
    const index = (this.tree as RustMerkleTree).getIndex(fieldToBytes(value));
    return index ?? null;
  }

  createInclusionProof(value: bigint): InclusionProof {
    if (this.ordered) throw new Error("Position-addressed trees require createInclusionProofAtIndex");
    return unpackProof((this.tree as RustMerkleTree).proof(fieldToBytes(value)));
  }

  getCurrentIndex(): number {
    return this.tree.leafCount;
  }

  verifyProof(proof: InclusionProof): boolean {
    return verifyRustMerkleProof(proof.leaf, proof.index, proof.siblings, proof.root);
  }
}
