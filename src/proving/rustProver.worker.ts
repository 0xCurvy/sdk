// Register wasm-bindgen-rayon's bootstrap listener before nested workers receive their init message.
import { initThreadPool as initRayonThreadPool } from "./_prover_wasm_threads/curvy_prover.js";
import { defaultCircuitKeyCache } from "./circuitKeyCache";
import { loadCachedArtifactsAndProve } from "./loadCachedArtifactsAndProve";
import type { Prover } from "./prover";
import { createInProcessRustProver, getRustProverRuntimeStatus, type RustProverOptions } from "./rustProver";
import type { RustProverWorkerRequest, RustProverWorkerResponse } from "./rustProverProtocol";

interface WorkerScope {
  addEventListener(type: "message", listener: (event: MessageEvent<RustProverWorkerRequest>) => void): void;
  postMessage(message: RustProverWorkerResponse): void;
}

const scope = globalThis as unknown as WorkerScope;
const artifactCache = defaultCircuitKeyCache();
let prover: Prover | undefined;

if (typeof initRayonThreadPool !== "function") {
  throw new Error("Threaded Rust prover bootstrap is unavailable");
}

function getProver(options: RustProverOptions): Prover {
  prover ??= createInProcessRustProver({ ...options, worker: false });
  return prover;
}

async function handleRequest(request: RustProverWorkerRequest): Promise<void> {
  try {
    const activeProver = getProver({
      threads: request.threads,
      wasm: {
        single: { url: request.wasm.singleUrl },
        threaded: { url: request.wasm.threadedUrl },
      },
    });
    const result = await loadCachedArtifactsAndProve(
      activeProver,
      artifactCache,
      {
        witnessGraph: request.witnessGraph,
        witnessGraphSha256: request.context.witnessGraphSha256,
        zkey: request.zkey,
        zkeySha256: request.context.zkeySha256,
      },
      request.input,
    );
    scope.postMessage({ id: request.id, ok: true, result, runtimeStatus: getRustProverRuntimeStatus() });
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    scope.postMessage({
      id: request.id,
      ok: false,
      error: { name: cause.name, message: cause.message, stack: cause.stack },
    });
  }
}

scope.addEventListener("message", (event) => {
  if (event.data?.type === "prove") void handleRequest(event.data);
});
