import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { IMT } from "@zk-kit/imt";
import { poseidon2 } from "poseidon-lite";
import { groth16, zKey } from "snarkjs";
import { describe, expect, it } from "vitest";

import { Note, ShardedNotesTree } from "@/note";
import { ephemeralPubKey, pubFromPrivateKey } from "./babyJubjub";
import type { InclusionProof } from "./merkleTree";
import { fieldsToBytes, verifyRustMerkleProof } from "./rustCore";
import { flattenWithdrawalCircuitInputs, generateWithdrawalCircuitInputsFromNotes } from "./witnessFromNotes";

const zkRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../zk-keys/v2/withdrawal");
const circuit = {
  wasm: join(zkRoot, "verifySingleWithdrawalNoHashing_2_30.wasm"),
  zkey: join(zkRoot, "verifySingleWithdrawalNoHashing_2_30_0001.zkey"),
};
const enabled = process.env.RUST_TREE_E2E === "1";
if (enabled && !existsSync(circuit.zkey)) {
  throw new Error(`Rust sharded Circom E2E requires ${circuit.zkey}`);
}
const maybe = enabled ? describe : describe.skip;

const fieldModulus = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
let seed = 0xabcdef1234567890n;
const randomField = (): bigint => {
  seed = (seed * 6364136223846793005n + 1442695040888963407n) & ((1n << 64n) - 1n);
  let value = seed;
  for (let index = 0; index < 3; index++) {
    seed = (seed * 6364136223846793005n + 1442695040888963407n) & ((1n << 64n) - 1n);
    value = (value << 64n) | seed;
  }
  return value % fieldModulus;
};

const ownerKey = "0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9";

maybe("Rust sharded SDK ↔ independent Node IMT ↔ Circom", () => {
  it("matches across a depth-14 rollover and proves with only Rust paths", async () => {
    const shardHeight = 14;
    const shardSize = 1 << shardHeight;
    const ownedIndices = [7, shardSize];
    const tokenId = randomField();
    const ownerPublicKey = pubFromPrivateKey(ownerKey) as [bigint, bigint];
    const notes = [1000n, 500n].map(
      (amount) =>
        new Note({
          amount,
          token: tokenId,
          owner: {
            babyJubjubPublicKey: { x: ownerPublicKey[0], y: ownerPublicKey[1] },
            sharedSecret: randomField(),
          },
          ephemeralKey: ephemeralPubKey(randomField()),
          viewTag: 0n,
        }),
    );

    const leaves = Array.from({ length: shardSize + 1 }, (_, index) => BigInt(index + 1));
    leaves[ownedIndices[0]] = notes[0].id;
    leaves[ownedIndices[1]] = notes[1].id;
    expect(new Set(leaves).size).toBe(leaves.length);

    const nodeTree = new IMT((children) => poseidon2(children.map((child) => BigInt(child))), 30, 0n, 2, [...leaves]);
    const nodeProofs: InclusionProof[] = ownedIndices.map((leafIndex) => {
      const proof = nodeTree.createProof(leafIndex);
      return {
        leaf: BigInt(proof.leaf),
        index: proof.leafIndex,
        siblings: proof.siblings.map(([sibling]) => BigInt(sibling)),
        root: BigInt(proof.root),
      };
    });

    const rustTree = new ShardedNotesTree({ depth: 30, shardHeight });
    notes.forEach((note, index) => {
      rustTree.mark(note.id, ownedIndices[index]);
    });
    rustTree.appendMany(leaves);
    expect(rustTree.root()).toBe(BigInt(nodeTree.root));

    const rustProofs = notes.map((note, index) => {
      const proof = rustTree.witness(note.id);
      expect(proof).toEqual(nodeProofs[index]);
      expect(fieldsToBytes([proof.leaf, proof.root, ...proof.siblings])).toEqual(
        fieldsToBytes([nodeProofs[index].leaf, nodeProofs[index].root, ...nodeProofs[index].siblings]),
      );
      expect(verifyRustMerkleProof(proof.leaf, proof.index, proof.siblings, proof.root)).toBe(true);
      return proof;
    });

    const witness = await generateWithdrawalCircuitInputsFromNotes({
      notes,
      ownerBjjPrivateKeyHex: ownerKey,
      supplied: { proofs: rustProofs, notesRoot: rustTree.root() },
      destinationAddress: randomField() % (1n << 160n),
      tokenId,
      maxInputs: 2,
      treeDepth: 30,
    });
    const { proof, publicSignals } = await groth16.fullProve(
      flattenWithdrawalCircuitInputs(witness),
      circuit.wasm,
      circuit.zkey,
    );
    const verificationKey = await zKey.exportVerificationKey(circuit.zkey);
    expect(await groth16.verify(verificationKey, publicSignals, proof)).toBe(true);
  }, 300_000);
});
