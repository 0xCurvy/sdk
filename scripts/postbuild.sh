#!/usr/bin/env bash
set -euo pipefail

# Run from the package root regardless of where the script is invoked.
cd "$(dirname "$0")/.."

# Mark the CJS output as CommonJS. The root package.json is `"type": "module"`,
# so dist/_esm needs no marker.
# The default (internal) build is ESM-only and has no dist/_cjs — only the
# publish build (CURVY_SDK_PUBLISH=1) emits it.
if [ -d dist/_cjs ]; then
  echo '{"type":"commonjs"}' > dist/_cjs/package.json
fi

# Ship the Rust WASM core + zk proving assets next to the build output, at dist/assets.
# The loader (src/proving/rustCore.ts) resolves these relative to import.meta.url /
# __dirname: "../assets" from the dist/_esm chunk, "../../assets" from a
# dist/_cjs/<group>/index.js entry — both land on dist/assets.
rm -rf dist/assets
cp -r assets dist/assets

# wasm-bindgen regenerates this helper. Fail loudly if its self-spawn URL patch
# disappears instead of shipping a worker that reloads the consumer app chunk.
if ! grep -q 'curvy.rustCoreRayonWorkerUrl' \
  src/proving/_wasm_threads/snippets/wasm-bindgen-rayon-*/src/workerHelpers.js; then
  echo "Generated Rust core Rayon helper is missing the standalone worker URL hook" >&2
  exit 1
fi

# Both browser worker entries must stay self-contained. A top-level import can
# make Rayon evaluate a consumer's document-dependent application chunk.
for worker in dist/_esm/proving/rustProverWorker.js dist/_esm/proving/rustCoreRayonWorker.js; do
  if grep -Eq '^import ' "$worker"; then
    echo "Worker bundle is not self-contained: $worker" >&2
    exit 1
  fi
  if ! grep -q 'wasm_bindgen_worker_init' "$worker"; then
    echo "Worker bundle is missing the Rayon bootstrap: $worker" >&2
    exit 1
  fi
done
