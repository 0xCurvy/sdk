import { defineConfig, type Options } from "tsup";

// One entry per public subpath (see package.json `exports`). Object form gives
// each entry a stable, predictable output path (e.g. dist/_esm/storage/idb/index.js).
const codeEntries: Record<string, string> = {
  index: "src/index.ts",
  "actions/index": "src/actions/index.ts",
  "config/index": "src/config/index.ts",
  "planner/index": "src/planner/index.ts",
  "utils/index": "src/public/utils.ts",
  "gas/index": "src/gas/index.ts",
  "note/index": "src/note/index.ts",
  "proving/index": "src/proving/index.ts",
  "rust-core": "src/core/rustCore.ts",
  "solana/index": "src/solana/index.ts",
  "rpc/index": "src/rpc/index.ts",
  "core/index": "src/core/index.ts",
  "contracts/index": "src/contracts/index.ts",
  // The concrete ApiClient (constructible for advanced/e2e use; normally built
  // by createCurvyConfig). Own entry — re-exporting it from http/index would
  // make index ⇄ api circular (ApiClient extends HttpClient defined in index).
  "http/api": "src/http/api.ts",
  "privacy-pass/index": "src/privacy-pass/index.ts",
  "storage/index": "src/storage/index.ts",
  "storage/idb/index": "src/storage/idb/index.ts",
  // Build-time only: the Vite plugin that applies the SDK's bundler requirements.
  vite: "src/vite.ts",
};

const typeEntries: Record<string, string> = { ...codeEntries };

// The WASM binaries are NOT an SDK asset: they ship inside
// `@0xcurvy/rs-core-wasm`, which stays external so the consumer's bundler
// resolves the generated glue's own `new URL("…_bg.wasm", import.meta.url)`.
//
// What the SDK does own is its proving worker, and each format reaches it from a
// different depth: ESM chunks sit at dist/_esm/, the worker bundle itself at
// dist/_esm/proving/. It is injected as one whole string literal so the
// `new URL(LITERAL, import.meta.url)` call stays statically analyzable by
// Vite/webpack/Rollup — that is what makes them emit the worker. (The CJS path
// is nominal: `createRustProver` only uses a worker in the browser.)
const workerDefines = (proverWorkerPath: string): Record<string, string> => ({
  __CURVY_PROVER_WORKER_URL__: JSON.stringify(proverWorkerPath),
});

export default defineConfig(() => {
  const isProd = process.env.NODE_ENV === "production";
  const buildPass = process.env.CURVY_SDK_PASS;
  const selectPasses = (js: Options[], dts: Options[]): Options[] => {
    if (buildPass === "js") {
      return js;
    }
    if (buildPass === "dts") {
      return dts;
    }
    return [...js, ...dts];
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
      options.define = { ...options.define, ...workerDefines("./proving/rustProverWorker.js") };
    },
  };

  // The SDK's proving worker, created by the consumer's bundler from
  // `new Worker(new URL(...), { type: "module" })`. It is bundled without shared
  // chunks so nothing but the external WASM package is imported from a worker
  // URL — Rayon's own nested workers are spawned by that package, not from here.
  const esmWorker: Options = {
    ...shared,
    entry: { rustProverWorker: "src/proving/rustProver.worker.ts" },
    format: ["esm"],
    outDir: "dist/_esm/proving",
    splitting: false,
    minify: isProd,
    dts: false,
    clean: false,
    esbuildOptions: (options) => {
      options.define = { ...options.define, ...workerDefines("./rustProverWorker.js") };
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
    return selectPasses([esm, esmWorker], [esmDts]);
  }

  const publishFormat = process.env.CURVY_SDK_FORMAT;
  if (publishFormat === "esm") {
    return selectPasses([esm, esmWorker], [esmDts]);
  }

  // Pass 3: CJS — esbuild can't code-split CJS, so each entry is self-contained.
  // The WASM package is ESM-only, so `require()` consumers get it bundled rather
  // than externalized. That is Node-only territory: it never reaches the browser
  // asset/worker paths the ESM build is shaped for.
  const cjs: Options = {
    ...shared,
    entry: codeEntries,
    format: ["cjs"],
    outDir: "dist/_cjs",
    splitting: false,
    minify: isProd,
    dts: false,
    clean: false,
    noExternal: [...(shared.noExternal ?? []), "@0xcurvy/rs-core-wasm"],
    esbuildOptions: (options) => {
      options.define = { ...options.define, ...workerDefines("../proving/rustProverWorker.js") };
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
    return selectPasses([cjs], [cjsDts]);
  }
  if (buildPass === "js") {
    return [esm, esmWorker, cjs];
  }
  if (buildPass === "dts") {
    return [esmDts, cjsDts];
  }

  return [esm, esmWorker, cjs, esmDts, cjsDts];
});
