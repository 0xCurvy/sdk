import { type Groth16Proof, groth16, type PublicSignals, type ZKArtifact } from "snarkjs";

export type { ZKArtifact };

/** Circuit kinds the SDK can prove client-side. */
export type CircuitId = "aggregation" | "withdrawal";

/** A Groth16 proof + its public signals — the output of any {@link Prover}. */
export type ProofResult = { proof: Groth16Proof; publicSignals: PublicSignals };

/** Authenticated artifact metadata resolved alongside a circuit configuration. */
export type ProverContext = {
  /** Trusted lowercase/uppercase SHA-256 digest of the proving key bytes. */
  zkeySha256?: string;
};

/**
 * The proving seam — pure COMPUTE. Takes a flat circuit-signals witness plus the
 * circuit's `wasm` + `zkey` (a Node path, a URL, or a buffer) and returns the
 * Groth16 proof.
 *
 * The prover does NOT own or discover artifacts: they are per-network data the
 * proving action resolves from the network's `CircuitConfig` (see GetNetworks)
 * and passes in. The default ({@link snarkjsProver}) runs `groth16.fullProve`; a
 * consumer injects a native prover (rapidsnark, a React Native native module, an
 * MV3 offscreen delegate) via `createCurvyConfig({ prover })`. A native prover
 * may download + cache the zkey from the URL internally — but the SDK always
 * hands it the resolved wasm/zkey. The proof + publicSignals are
 * scheme-identical across implementations; only the compute differs.
 */
export interface Prover {
  prove(input: object, wasm: ZKArtifact, zkey: ZKArtifact, context?: ProverContext): Promise<ProofResult>;
  /** Release parsed keys or platform workers owned by this prover instance. */
  destroy?(): void | Promise<void>;
}

/**
 * Default prover: snarkjs `groth16.fullProve`. Statically imported (the core
 * already imports snarkjs, so it is in the bundle anyway, and a static import
 * avoids dynamic `import()` — a sharp edge in MV3 extension service workers). On
 * React Native, where Hermes has no `WebAssembly`, inject a native prover.
 */
export const snarkjsProver: Prover = {
  prove(input, wasm, zkey) {
    return groth16.fullProve(input as Parameters<typeof groth16.fullProve>[0], wasm, zkey);
  },
};
