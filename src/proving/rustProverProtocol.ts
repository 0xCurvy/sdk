import type { RustCoreRuntimeStatus, RustCoreThreads } from "@/core/rustCore";
import type { ProofResult, ProverContext, ZKArtifact } from "./prover";

export interface RustProverWorkerRequest {
  id: number;
  type: "prove";
  input: object;
  witnessGraph: ZKArtifact;
  zkey: ZKArtifact;
  context: ProverContext;
  threads: RustCoreThreads;
}

export type RustProverWorkerResponse =
  | {
      id: number;
      ok: true;
      result: ProofResult;
      runtimeStatus: RustCoreRuntimeStatus;
    }
  | {
      id: number;
      ok: false;
      error: { name: string; message: string; stack?: string };
    };
