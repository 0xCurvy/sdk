import { defineConfig, type Options } from "tsup";

// One entry per public subpath (see package.json `exports`). Object form gives
// each entry a stable, predictable output path (e.g. dist/_esm/storage/idb/index.js).
const codeEntries: Record<string, string> = {
  index: "src/index.ts",
  "actions/index": "src/actions/index.ts",
  "config/index": "src/config/index.ts",
  "utils/index": "src/utils/index.ts",
  "gas/index": "src/gas/index.ts",
  "note/index": "src/note/index.ts",
  "proving/index": "src/proving/index.ts",
  "solana/index": "src/solana/index.ts",
  "rpc/index": "src/rpc/index.ts",
  "core/index": "src/core/index.ts",
  "http/index": "src/http/index.ts",
  // The concrete ApiClient (constructible for advanced/e2e use; normally built
  // by createCurvyConfig). Own entry — re-exporting it from http/index would
  // make index ⇄ api circular (ApiClient extends HttpClient defined in index).
  "http/api": "src/http/api.ts",
  "privacy-pass/index": "src/privacy-pass/index.ts",
  "storage/index": "src/storage/index.ts",
  "storage/idb/index": "src/storage/idb/index.ts",
  errors: "src/errors.ts",
  "types/index": "src/types/index.ts",
  // Side-effect module that installs `globalThis.Go`. Emitted as its own file so
  // the package.json `sideEffects` carve-out can match it by name and stop
  // consumers' tree-shakers from dropping the Go runtime install.
  "core/wasm-exec": "src/core/wasm-exec.js",
};

// Types: same entries minus the export-less wasm-exec shim (no meaningful .d.ts).
const typeEntries: Record<string, string> = { ...codeEntries };
delete typeEntries["core/wasm-exec"];

// Per-format asset path literals injected via esbuild `define`. `rel` is the
// path from the emitted module to dist/assets: "../assets" from the ESM chunk at
// dist/_esm/, "../../assets" from a dist/_cjs/<group>/index entry. The full
// per-asset paths are injected as single string literals so the browser's
// `new URL(LITERAL, import.meta.url)` calls stay statically analyzable by
// downstream bundlers (Vite/webpack/Rollup), which need that to emit the assets.
const assetDefines = (rel: string): Record<string, string> => ({
  __CURVY_ASSETS_REL__: JSON.stringify(rel),
  __CURVY_CORE_WASM_URL__: JSON.stringify(`${rel}/core/curvy-core-v1.0.2.wasm`),
});

export default defineConfig(() => {
  const isProd = process.env.NODE_ENV === "production";

  const shared: Options = {
    target: "es2024",
    platform: "neutral",
    treeshake: "recommended",
    sourcemap: true,
    // Bundle the BabyJubjub/EdDSA crypto into the dist instead of externalizing
    // it. @zk-kit/eddsa-poseidon (ESM) imports blakejs (CJS) via named exports
    // that node's ESM loader can't resolve at runtime ("Named export
    // 'blake2bFinal' not found"); bundling lets esbuild resolve the interop at
    // build time, so consumers (devenv vitest, app bundlers, external npm users)
    // get a self-contained module with no special config.
    // @cloudflare/privacypass-ts + blindrsa-ts are ESM-only — bundle them (and
    // their small codec deps) so the CJS pass doesn't emit require() of ESM.
    noExternal: [
      "@zk-kit/eddsa-poseidon",
      "@zk-kit/baby-jubjub",
      /^@cloudflare\/(privacypass-ts|blindrsa-ts|voprf-ts)/,
      "asn1-parser",
      "quicvarint",
      "rfc4648",
      "asn1js",
    ],
  };

  // Pass 1: ESM — code-split so shared code dedupes into chunks across subpaths.
  const esm: Options = {
    ...shared,
    entry: codeEntries,
    format: ["esm"],
    outDir: "dist/_esm",
    splitting: true,
    minify: isProd,
    dts: false,
    clean: false,
    esbuildOptions: (options) => {
      options.define = { ...options.define, ...assetDefines("../assets") };
    },
  };

  // Pass 2: ESM type declarations (.d.ts) for the "import" condition. Every
  // internal workspace consumer is ESM and typechecks against these via tsc, so
  // they ship in every build.
  const esmDts: Options = {
    ...shared,
    entry: typeEntries,
    format: ["esm"],
    dts: { only: true },
    outDir: "dist/_types",
    clean: false,
  };

  // Default = ESM-only (JS + .d.ts). That is everything internal consumers need,
  // and it skips the CJS bundle + the second (CJS) DTS rollup — the slow part of
  // the build. The npm-published package must keep CJS + .d.cts for external
  // `require` consumers, so the publish build (CURVY_SDK_PUBLISH=1, via
  // `pnpm run build:publish`) adds them back. Keep publish output byte-for-byte
  // as before by preserving the original pass order: esm, cjs, esm-dts, cjs-dts.
  if (!process.env.CURVY_SDK_PUBLISH) {
    return [esm, esmDts];
  }

  // Pass 3: CJS — esbuild can't code-split CJS, so each entry is self-contained.
  const cjs: Options = {
    ...shared,
    entry: codeEntries,
    format: ["cjs"],
    outDir: "dist/_cjs",
    splitting: false,
    minify: isProd,
    dts: false,
    clean: false,
    esbuildOptions: (options) => {
      options.define = { ...options.define, ...assetDefines("../../assets") };
    },
  };

  // Pass 4: CJS type declarations (.d.cts) for the "require" condition. Without
  // these, attw/publint flag the CJS types as masquerading ESM.
  const cjsDts: Options = {
    ...shared,
    entry: typeEntries,
    format: ["cjs"],
    dts: { only: true },
    outDir: "dist/_types",
    clean: false,
  };

  return [esm, cjs, esmDts, cjsDts];
});
