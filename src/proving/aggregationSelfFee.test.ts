import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { groth16 } from "snarkjs";
import { describe, expect, it } from "vitest";
import { Note } from "@/note";
import { pubFromPrivateKey } from "./babyJubjub";
import { MerkleTree } from "./merkleTree";
import { buildAggregationWitnessBundle, flattenAggregationCircuitInputs } from "./witnessFromNotes";

// Validates that the SDK's protocol-fee base matches the DEPLOYED aggregation circuit:
// the circuit charges the fee only on value LEAVING the sender (its `isSender` check
// skips sender-owned outputs). So a sender-owned output (e.g. a withdrawal carve-out's
// self note) must NOT be in `spentToOthers`. With the old code (which summed all
// recipients) the SDK feeNote amount disagreed with the circuit and the proof failed.

const KEYS = resolve(process.cwd(), "../../zk-keys/v2/aggregation");
const WASM = resolve(KEYS, "verifySingleAggregationNoHashing_2_3_30.wasm");
const ZKEY = resolve(KEYS, "verifySingleAggregationNoHashing_2_3_30_0001.zkey");
const VKEY = JSON.parse(
  readFileSync(resolve(KEYS, "verifySingleAggregationNoHashing_2_3_30_verification_key.json"), "utf8"),
);

const OWNER_PRIV = `0x${"22".repeat(31)}`;
const TOKEN = 1n;
const DEPTH = 30;

describe("aggregation self-recipient fee base (deployed circuit)", () => {
  it("charges the protocol fee only on non-sender outputs (self carve-out is fee-exempt)", async () => {
    const ownerPub = pubFromPrivateKey(OWNER_PRIV);
    // Perturb the sender's coords for distinct non-sender pubkeys (the circuit only
    // hashes recipient/fee owner keys; on-curve-ness isn't constrained for them).
    const otherPub: [bigint, bigint] = [ownerPub[0] + 1n, ownerPub[1] + 1n];
    const feePub: [bigint, bigint] = [ownerPub[0] + 2n, ownerPub[1] + 2n];

    const ownedInput = (amount: bigint, ss: bigint) =>
      new Note({
        amount,
        token: TOKEN,
        owner: { babyJubjubPublicKey: { x: ownerPub[0], y: ownerPub[1] }, sharedSecret: ss },
        ephemeralKey: [0n, 0n],
        viewTag: 0n,
      });

    const inputNotes = [ownedInput(600_000n, 1n), ownedInput(400_000n, 2n)]; // total 1_000_000
    const tree = new MerkleTree({ depth: DEPTH });
    for (const n of inputNotes) tree.insert(n.id);

    const { witness, feeNote } = await buildAggregationWitnessBundle({
      inputNotes,
      ownerBjjPrivateKeyHex: OWNER_PRIV,
      // 50k to SELF (carve-out style) + 100k to ANOTHER. Only the 100k leaves the sender.
      // (Fee kept < 1000 to clear the deployed circuit's protocolFeeQ<=999 range check —
      // a known leftover cap, tracked separately.)
      recipients: [
        { amount: 50_000n, ownerPub, sharedSecret: 7n }, // self
        { amount: 100_000n, ownerPub: otherPub, sharedSecret: 9n }, // other
      ],
      feeNotePublicKey: [feePub[0], feePub[1]],
      protocolFeePerThousand: 5n, // 0.5%
      gasFee: 0n,
      notesTree: tree,
      maxInputs: 2,
      maxOutputs: 3,
      treeDepth: DEPTH,
    });

    // Fee base is the 100k that left the sender ONLY: 100000 * 5 / 1000 = 500.
    // (Old code summed self+other = 150000 => 750, which the circuit's feeNote
    // constraint rejects, since the circuit's own base excludes the self note.)
    expect(feeNote.amount).toBe(500n);

    const { proof, publicSignals } = await groth16.fullProve(flattenAggregationCircuitInputs(witness), WASM, ZKEY);
    expect(await groth16.verify(VKEY, publicSignals, proof)).toBe(true);
  }, 60_000);
});
