import { existsSync, globSync, readFileSync, writeFileSync } from "node:fs";
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

// Nothing is copied into dist/assets any more: the WASM binaries live in
// @0xcurvy/rs-core-wasm, which the ESM build keeps external so the consumer's
// bundler emits them from the generated glue's own `new URL(…, import.meta.url)`.

// The proving worker is fetched from a worker URL, so it must not depend on the
// SDK's sibling chunks — only on bare specifiers the consumer's bundler resolves.
const workerBundle = "dist/_esm/proving/rustProverWorker.js";
const source = readFileSync(workerBundle, "utf8");

// Both patterns must survive minification, where esbuild drops the space after
// the keyword and puts every import on one line (`import*as r from"x";import{y}
// from"./z"`). Anchoring on `^` + `\s+` matched neither, which silently disarmed
// the relative-chunk check AND failed the rs-core check on any minified build.
// So: require only that `import` starts a statement, and keep the clause pattern
// quote/semicolon-free so it can never run past its own statement.
const STATIC_IMPORT = /(?:^|[;}\n])\s*import\s*(?:[^;'"]*?\bfrom\s*)?(["'])([^"']+)\1/g;
// A dynamic import drags in a sibling chunk just as effectively as a static one.
const DYNAMIC_IMPORT = /\bimport\s*\(\s*(["'])([^"']+)\1\s*\)/g;

const imports = [
  ...[...source.matchAll(STATIC_IMPORT)].map((match) => match[2]),
  ...[...source.matchAll(DYNAMIC_IMPORT)].map((match) => match[2]),
];
const relative = imports.filter((specifier) => specifier.startsWith("."));
if (relative.length > 0) {
  console.error(`Worker bundle imports SDK-relative chunks: ${workerBundle} -> ${relative.join(", ")}`);
  process.exit(1);
}
if (!imports.some((specifier) => specifier.startsWith("@0xcurvy/rs-core-wasm"))) {
  console.error(`Worker bundle no longer imports the Rust prover: ${workerBundle}`);
  process.exit(1);
}

// Vite only discovers package-owned workers when the URL expression is passed
// directly to the Worker constructor. Assigning the URL to a variable first
// makes Vite copy this file as an opaque asset, leaving the worker's bare
// rs-core import unresolved in the browser.
const INLINE_WORKER_URL =
  /new\s+Worker\s*\(\s*new\s+URL\s*\(\s*["']\.\/proving\/rustProverWorker\.js["']\s*,\s*import\.meta\.url\s*\)/;
const sdkBundles = globSync("dist/_esm/**/*.js");
if (!sdkBundles.some((bundle) => INLINE_WORKER_URL.test(readFileSync(bundle, "utf8")))) {
  console.error("SDK bundle no longer constructs the Rust prover worker with an inline static URL");
  process.exit(1);
}
