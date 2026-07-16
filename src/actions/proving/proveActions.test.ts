import { describe, expect, it, vi } from "vitest";
import type { WithdrawCircuitInputs } from "@/proving/circuitInputs";
import type { ProofResult, Prover } from "@/proving/prover";
import { createFakeConfig, DEFAULT_TEST_PROTOCOL } from "@/test/fixtures";
import type { Network, ProtocolConfig } from "@/types/api";
import { proveWithdrawal } from "./proveWithdrawal";

const SENTINEL = { proof: {}, publicSignals: ["42"] } as unknown as ProofResult;

// A withdrawal witness with empty note/proof arrays — enough for `flatten` to run
// without touching per-note shapes; the action only flattens + delegates.
const minimalWithdrawWitness = {
  inputNotes: [],
  publicKey: [0n, 0n],
  inputNoteInclusionProofs: [],
  signature: { S: 0n, R8: [0n, 0n] },
  notesRoot: 0n,
  destinationAddress: 0n,
  tokenId: 0n,
} as unknown as WithdrawCircuitInputs;

const ZKEY_SHA256 = "ab".repeat(32);
const cc = (wasmPath: string, zkeyPath: string) => ({
  wasmPath,
  zkeyPath,
  zkeySha256: ZKEY_SHA256,
  treeDepth: 30,
  maxInputs: 2,
  maxOutputs: 0,
  batchSize: 1,
  groupFee: 0,
});

/** A minimal network (slug only) — the withdrawal circuit config now lives on the protocol. */
const network = { slug: "localnet" } as unknown as Network;

/** Build a protocol whose `proving.withdrawal` carries the given circuit config (default = no wasm/zkey). */
const protocolWith = (withdrawal?: ReturnType<typeof cc>): ProtocolConfig =>
  withdrawal
    ? { ...DEFAULT_TEST_PROTOCOL, proving: { ...DEFAULT_TEST_PROTOCOL.proving, withdrawal } }
    : DEFAULT_TEST_PROTOCOL;

const configFor = (protocol: ProtocolConfig, extra: Record<string, unknown> = {}) =>
  createFakeConfig({ networks: [network], activeNetworks: [network], protocol, ...extra });

describe("client-proving actions (network-config artifacts + compute prover)", () => {
  it("resolves the network's withdrawal artifacts and passes them + the FLAT witness to the prover", async () => {
    const prove = vi.fn<Prover["prove"]>(async () => SENTINEL);
    const config = configFor(protocolWith(cc("w.wasm", "z.zkey")), { prover: { prove } });

    const result = await proveWithdrawal({ config, witness: minimalWithdrawWitness });

    expect(result).toBe(SENTINEL);
    const [input, wasm, zkey, context] = prove.mock.calls[0];
    expect(wasm).toBe("w.wasm");
    expect(zkey).toBe("z.zkey");
    expect(context).toEqual({ zkeySha256: ZKEY_SHA256 });
    // The FLATTENED witness (3-tuple signature), not the bus one.
    expect(input).toMatchObject({ signature: [0n, 0n, 0n], notesRoot: 0n, tokenId: 0n });
  });

  it("rewrites s3:// key paths against circuitKeysBaseUrl", async () => {
    const prove = vi.fn<Prover["prove"]>(async () => SENTINEL);
    const config = configFor(protocolWith(cc("s3://zk-keys/withdrawal/w.wasm", "s3://zk-keys/withdrawal/w.zkey")), {
      prover: { prove },
      circuitKeysBaseUrl: "https://cdn.example.com/keys/",
    });

    await proveWithdrawal({ config, witness: minimalWithdrawWitness });

    const [, wasm, zkey] = prove.mock.calls[0];
    expect(wasm).toBe("https://cdn.example.com/keys/withdrawal/w.wasm");
    expect(zkey).toBe("https://cdn.example.com/keys/withdrawal/w.zkey");
  });

  it("throws when the network has no withdrawal circuit config", async () => {
    const config = configFor(protocolWith(undefined));
    await expect(proveWithdrawal({ config, witness: minimalWithdrawWitness })).rejects.toThrow(
      /no withdrawal circuit config/,
    );
  });

  it("throws when an s3:// key has no circuitKeysBaseUrl configured", async () => {
    const config = configFor(protocolWith(cc("s3://zk-keys/withdrawal/w.wasm", "s3://zk-keys/withdrawal/w.zkey")));
    await expect(proveWithdrawal({ config, witness: minimalWithdrawWitness })).rejects.toThrow(/no circuitKeysBaseUrl/);
  });
});
