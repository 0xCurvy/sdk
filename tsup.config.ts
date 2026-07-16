import { defineConfig, type Options } from "tsup";

const actionEntryNames = ["account", "auth", "balances", "networks", "planner", "portals"] as const;

const utilsEntryNames = ["address", "encoding", "hash", "keys", "network"] as const;

const actionEntries = Object.fromEntries(
  actionEntryNames.map((name) => [`actions/${name}/index`, `src/actions/${name}/index.ts`]),
);

const utilsEntries = Object.fromEntries(
  utilsEntryNames.map((name) => [`utils/${name}/index`, `src/utils/${name}/index.ts`]),
);

// One entry per public subpath (see package.json `exports`). Object form gives
// each entry a stable, predictable output path (e.g. dist/_esm/storage/idb/index.js).
const codeEntries: Record<string, string> = {
  index: "src/index.ts",
  "actions/index": "src/actions/index.ts",
  ...actionEntries,
  "config/index": "src/config/index.ts",
  "config/browser": "src/config/browser.ts",
  "config/server": "src/config/server.ts",
  "utils/index": "src/utils/index.ts",
  ...utilsEntries,
  "utils/brand": "src/utils/brand.ts",
  "utils/invariant": "src/utils/invariant.ts",
  "utils/timer": "src/utils/timer.ts",
  "gas/index": "src/gas/index.ts",
  "note/index": "src/note/index.ts",
  "proving/index": "src/proving/index.ts",
  "rust-core": "src/proving/rustCore.ts",
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
};

const typeEntries: Record<string, string> = { ...codeEntries };

// Per-format asset path literals injected via esbuild `define`. `rel` is the
// path from the emitted module to dist/assets: "../assets" from the ESM chunk at
// dist/_esm/, "../../assets" from a dist/_cjs/<group>/index entry. The full
// per-asset paths are injected as single string literals so the browser's
// `new URL(LITERAL, import.meta.url)` calls stay statically analyzable by
// downstream bundlers (Vite/webpack/Rollup), which need that to emit the assets.
const assetDefines = (rel: string): Record<string, string> => ({
  __CURVY_ASSETS_REL__: JSON.stringify(rel),
  __CURVY_CORE_RS_WASM_URL__: JSON.stringify(`${rel}/core-rs/curvy_core_bg.wasm`),
  __CURVY_CORE_RS_THREADS_WASM_URL__: JSON.stringify(`${rel}/core-rs/curvy_core_threads_bg.wasm`),
  __CURVY_PROVER_RS_WASM_URL__: JSON.stringify(`${rel}/core-rs/curvy_prover_bg.wasm`),
  __CURVY_PROVER_RS_THREADS_WASM_URL__: JSON.stringify(`${rel}/core-rs/curvy_prover_threads_bg.wasm`),
});

export default defineConfig(() => {
  const isProd = process.env.NODE_ENV === "production";
  const buildPass = process.env.CURVY_SDK_PASS;
  const selectPasses = (js: Options, dts: Options): Options[] => {
    if (buildPass === "js") {
      return [js];
    }
    if (buildPass === "dts") {
      return [dts];
    }
    return [js, dts];
  };

  const shared: Options = {
    target: "es2024",
    platform: "neutral",
    treeshake: "recommended",
    sourcemap: true,
    // @cloudflare/privacypass-ts + blindrsa-ts are ESM-only — bundle them (and
    // their small codec deps) so the CJS pass doesn't emit require() of ESM.
    noExternal: [
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
  // `pnpm run build:publish`) adds them back. CURVY_SDK_PASS lets package
  // scripts run JS and DTS separately so declaration bundling gets its own heap.
  if (!process.env.CURVY_SDK_PUBLISH) {
    return selectPasses(esm, esmDts);
  }

  const publishFormat = process.env.CURVY_SDK_FORMAT;
  if (publishFormat === "esm") {
    return selectPasses(esm, esmDts);
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

  if (publishFormat === "cjs") {
    return selectPasses(cjs, cjsDts);
  }
  if (buildPass === "js") {
    return [esm, cjs];
  }
  if (buildPass === "dts") {
    return [esmDts, cjsDts];
  }

  return [esm, cjs, esmDts, cjsDts];
});
