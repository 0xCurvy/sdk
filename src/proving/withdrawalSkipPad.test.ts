import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { groth16 } from "snarkjs";
import { describe, expect, it } from "vitest";
import { Note } from "@/note";
import { pubFromPrivateKey } from "./babyJubjub";
import { MerkleTree } from "./merkleTree";
import { flattenWithdrawalCircuitInputs, generateWithdrawalCircuitInputsFromNotes } from "./witnessFromNotes";

// Verifies that the DEPLOYED withdrawal circuit (verifySingleWithdrawalNoHashing_2_30)
// accepts a SINGLE real input note with the unused slot zero-padded — i.e. it is
// skip-aware like aggregation. If this proof verifies against the deployed vkey, the
// builder/planner are right to allow 1..maxInputs (the on-chain verifier is generated
// from this same vkey, and the identical aggregation skip-pattern already verifies
// on-chain in the devenv e2e).

const KEYS = resolve(process.cwd(), "../../zk-keys/v2/withdrawal");
const WASM = resolve(KEYS, "verifySingleWithdrawalNoHashing_2_30.wasm");
const ZKEY = resolve(KEYS, "verifySingleWithdrawalNoHashing_2_30_0001.zkey");
const VKEY = JSON.parse(
  readFileSync(resolve(KEYS, "verifySingleWithdrawalNoHashing_2_30_verification_key.json"), "utf8"),
);

const OWNER_PRIV = `0x${"11".repeat(31)}`;
const TOKEN = 1n;
const DEPTH = 30;
const MAX_INPUTS = 2;

describe("withdrawal skip-pad (deployed circuit)", () => {
  it("proves + verifies a single committed note (unused slot zero-padded)", async () => {
    const ownerPub = pubFromPrivateKey(OWNER_PRIV);
    const note = new Note({
      amount: 100n,
      token: TOKEN,
      owner: { babyJubjubPublicKey: { x: ownerPub[0], y: ownerPub[1] }, sharedSecret: 7n },
      ephemeralKey: [0n, 0n],
      viewTag: 0n,
    });

    // Real committed tree with the single note as leaf 0.
    const tree = new MerkleTree({ depth: DEPTH });
    tree.insert(note.id);

    const witness = await generateWithdrawalCircuitInputsFromNotes({
      notes: [note], // ONE real note → builder zero-pads the second slot
      ownerBjjPrivateKeyHex: OWNER_PRIV,
      notesTree: tree,
      destinationAddress: 0x00000000000000000000000000000000deadbeefn,
      tokenId: TOKEN,
      maxInputs: MAX_INPUTS,
      treeDepth: DEPTH,
    });

    const { proof, publicSignals } = await groth16.fullProve(flattenWithdrawalCircuitInputs(witness), WASM, ZKEY);
    const ok = await groth16.verify(VKEY, publicSignals, proof);
    expect(ok).toBe(true);
  }, 60_000);
});
