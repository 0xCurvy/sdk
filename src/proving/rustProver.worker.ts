// The SDK's proving worker: keeps witness generation and Groth16 off the main
// thread. Rayon's own nested workers are spawned by the generated glue itself
// (it self-spawns `workerHelpers.js`), so nothing has to be bootstrapped here.
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

function getProver(options: RustProverOptions): Prover {
  prover ??= createInProcessRustProver({ ...options, worker: false });
  return prover;
}

async function handleRequest(request: RustProverWorkerRequest): Promise<void> {
  try {
    const activeProver = getProver({ threads: request.threads });
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
