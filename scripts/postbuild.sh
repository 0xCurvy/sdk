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
