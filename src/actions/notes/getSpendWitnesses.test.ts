import { describe, expect, it } from "vitest";
import { getNotesTreeParameters } from "@/core/rustCore";
import { GlobalNotesTree } from "@/note/notesTreeView";
import { MerkleTree } from "@/proving/merkleTree";
import { createFakeConfig, fixtureNetwork } from "@/test/fixtures";
import { getSpendWitnesses } from "./getSpendWitnesses";

describe("getSpendWitnesses", () => {
  it("returns ordered proofs at the synced root", async () => {
    const { depth } = getNotesTreeParameters();
    const leaves = [11n, 22n, 33n];
    const merkle = MerkleTree.fromLeaves({ depth }, leaves);
    const tree = new GlobalNotesTree({ tree: merkle, leaves: leaves.map(String), nullifiers: new Set() });
    const network = fixtureNetwork();
    const config = createFakeConfig({ networks: [network], activeNetworks: [network] });
    config._internal.notesTrees.set(network.slug, tree);

    const result = await getSpendWitnesses({ config, networkSlug: network.slug, noteIds: [33n, 11n] });

    expect(result.notesRoot).toBe(merkle.root());
    expect(result.proofs.map((proof) => proof.index)).toEqual([2, 0]);
    expect(result.proofs.every((proof) => merkle.verifyProof(proof))).toBe(true);
  });

  it("explains that a network must be synced first", async () => {
    const config = createFakeConfig();
    await expect(getSpendWitnesses({ config, networkSlug: "missing", noteIds: [1n] })).rejects.toThrow(
      /run syncNotes first/,
    );
  });
});
