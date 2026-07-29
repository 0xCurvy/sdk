import { cpSync, existsSync, globSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Run from the package root regardless of where the script is invoked.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

// Mark the CJS output as CommonJS. The root package.json is `"type": "module"`,
// so dist/_esm needs no marker.
// The default (internal) build is ESM-only and has no dist/_cjs — only the
// publish build (CURVY_SDK_PUBLISH=1) emits it.
if (existsSync("dist/_cjs")) {
  writeFileSync("dist/_cjs/package.json", '{"type":"commonjs"}\n');
}

// Ship the Rust WASM core + zk proving assets next to the build output, at dist/assets.
// The loader (src/proving/rustCore.ts) resolves these relative to import.meta.url /
// __dirname: "../assets" from the dist/_esm chunk, "../../assets" from a
// dist/_cjs/<group>/index.js entry — both land on dist/assets.
rmSync("dist/assets", { recursive: true, force: true });
cpSync("assets", "dist/assets", { recursive: true });

// wasm-bindgen regenerates this helper. Fail loudly if its self-spawn URL patch
// disappears instead of shipping a worker that reloads the consumer app chunk.
const rayonHelpers = globSync(
  "src/proving/_wasm_threads/snippets/wasm-bindgen-rayon-*/src/workerHelpers.js",
);
if (
  rayonHelpers.length === 0 ||
  !rayonHelpers.some((file) => readFileSync(file, "utf8").includes("curvy.rustCoreRayonWorkerUrl"))
) {
  console.error("Generated Rust core Rayon helper is missing the standalone worker URL hook");
  process.exit(1);
}

// Both browser worker entries must stay self-contained. A top-level import can
// make Rayon evaluate a consumer's document-dependent application chunk.
for (const worker of [
  "dist/_esm/proving/rustProverWorker.js",
  "dist/_esm/proving/rustCoreRayonWorker.js",
]) {
  const source = readFileSync(worker, "utf8");
  if (/^import /m.test(source)) {
    console.error(`Worker bundle is not self-contained: ${worker}`);
    process.exit(1);
  }
  if (!source.includes("wasm_bindgen_worker_init")) {
    console.error(`Worker bundle is missing the Rayon bootstrap: ${worker}`);
    process.exit(1);
  }
}
