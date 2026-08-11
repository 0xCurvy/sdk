#!/usr/bin/env bash
# Thin wrapper so `pnpm build` and the Windows build script (scripts/build.mjs)
# run the same postbuild checks. The logic lives in postbuild.mjs.
set -euo pipefail

cd "$(dirname "$0")/.."
node scripts/postbuild.mjs
