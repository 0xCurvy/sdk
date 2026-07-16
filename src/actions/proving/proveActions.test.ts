import { describe, expect, it, vi } from "vitest";
import type { WithdrawCircuitInputs } from "@/proving/circuitInputs";
import type { CircuitKeyCache } from "@/proving/circuitKeyCache";
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
const GRAPH_SHA256 = "cd".repeat(32);
const cc = (witnessGraphPath: string, zkeyPath: string) => ({
  witnessEngine: "curvy-graph-v1" as const,
  witnessGraphPath,
  witnessGraphSha256: GRAPH_SHA256,
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

/** Build a protocol whose `proving.withdrawal` carries the given circuit config. */
const protocolWith = (withdrawal?: ReturnType<typeof cc>): ProtocolConfig =>
  withdrawal
    ? { ...DEFAULT_TEST_PROTOCOL, proving: { ...DEFAULT_TEST_PROTOCOL.proving, withdrawal } }
    : DEFAULT_TEST_PROTOCOL;

const configFor = (protocol: ProtocolConfig, extra: Record<string, unknown> = {}) =>
  createFakeConfig({ networks: [network], activeNetworks: [network], protocol, ...extra });

describe("client-proving actions (network-config artifacts + compute prover)", () => {
  it("resolves the network's withdrawal artifacts and passes them + the FLAT witness to the prover", async () => {
    const prove = vi.fn<Prover["prove"]>(async () => SENTINEL);
    const config = configFor(protocolWith(cc("w.graph.bin", "z.zkey")), { prover: { prove } });

    const result = await proveWithdrawal({ config, witness: minimalWithdrawWitness });

    expect(result).toBe(SENTINEL);
    const [input, graph, zkey, context] = prove.mock.calls[0];
    expect(graph).toBe("w.graph.bin");
    expect(zkey).toBe("z.zkey");
    expect(context).toEqual({ witnessGraphSha256: GRAPH_SHA256, zkeySha256: ZKEY_SHA256 });
    // The FLATTENED witness (3-tuple signature), not the bus one.
    expect(input).toMatchObject({ signature: [0n, 0n, 0n], notesRoot: 0n, tokenId: 0n });
  });

  it("rewrites s3:// key paths against circuitKeysBaseUrl", async () => {
    const prove = vi.fn<Prover["prove"]>(async () => SENTINEL);
    const config = configFor(
      protocolWith(cc("s3://zk-keys/withdrawal/w.graph.bin", "s3://zk-keys/withdrawal/w.zkey")),
      {
        prover: { prove },
        circuitKeysBaseUrl: "https://cdn.example.com/keys/",
      },
    );

    await proveWithdrawal({ config, witness: minimalWithdrawWitness });

    const [, graph, zkey] = prove.mock.calls[0];
    expect(graph).toBe("https://cdn.example.com/keys/withdrawal/w.graph.bin");
    expect(zkey).toBe("https://cdn.example.com/keys/withdrawal/w.zkey");
  });

  it("rejects a protocol config that does not advertise the Rust graph engine", async () => {
    const config = configFor(protocolWith(undefined));
    await expect(proveWithdrawal({ config, witness: minimalWithdrawWitness })).rejects.toThrow(
      /unsupported withdrawal/,
    );
  });

  it("throws when an s3:// key has no circuitKeysBaseUrl configured", async () => {
    const config = configFor(protocolWith(cc("s3://zk-keys/withdrawal/w.graph.bin", "s3://zk-keys/withdrawal/w.zkey")));
    await expect(proveWithdrawal({ config, witness: minimalWithdrawWitness })).rejects.toThrow(/no circuitKeysBaseUrl/);
  });

  it("evicts a corrupt remote bundle and retries exactly once", async () => {
    const graph = "https://cdn.example.com/withdrawal/w.graph.bin";
    const zkey = "https://cdn.example.com/withdrawal/w.zkey";
    const key = (url: string, digest: string) => `${url}?__curvy_sha256=${digest}`;
    const entries = new Map<string, Uint8Array>([
      [key(graph, GRAPH_SHA256), new Uint8Array([1])],
      [key(zkey, ZKEY_SHA256), new Uint8Array([2])],
    ]);
    const cache = {
      get: vi.fn(async (cacheKey: string) => entries.get(cacheKey) ?? null),
      put: vi.fn(async (cacheKey: string, bytes: Uint8Array) => {
        entries.set(cacheKey, bytes);
      }),
      delete: vi.fn(async (cacheKey: string) => {
        entries.delete(cacheKey);
      }),
    } satisfies CircuitKeyCache;
    const prove = vi
      .fn<Prover["prove"]>()
      .mockRejectedValueOnce(new Error("witness graph SHA-256 mismatch"))
      .mockResolvedValueOnce(SENTINEL);
    const fetchFn = vi.fn(async () => new Response(new Uint8Array([9]) as BodyInit, { status: 200 }));
    vi.stubGlobal("fetch", fetchFn);

    try {
      const config = configFor(protocolWith(cc(graph, zkey)), { prover: { prove }, circuitKeyCache: cache });
      expect(await proveWithdrawal({ config, witness: minimalWithdrawWitness })).toBe(SENTINEL);
      expect(prove).toHaveBeenCalledTimes(2);
      expect(cache.delete).toHaveBeenCalledTimes(2);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
