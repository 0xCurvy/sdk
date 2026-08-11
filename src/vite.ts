// Vite plugin: applies the configuration the SDK's WASM core and workers need.
//
// Everything here is plain, documented Vite config — the plugin exists so the
// requirements live in one versioned place instead of being copied into every
// consumer's vite.config.ts. This module is build-time only and is never
// imported by the SDK's runtime entry points.
//
// It deliberately does NOT import Vite's own `Plugin` type: that type is not
// structurally compatible across major versions (Vite 7 changed the `hotUpdate`
// hook's `this`), so importing it would pin consumers to whichever major the SDK
// happened to build against. The hand-written shape below is assignable to
// `PluginOption` in both Vite 6 and 7 — the repo typechecks one consumer of each.

/**
 * How the dev/preview server should opt into cross-origin isolation, which the
 * Rayon (threaded) builds require:
 *
 * - `"credentialless"` — `Document-Isolation-Policy: isolate-and-credentialless`.
 *   Isolates this document without demanding CORP from third parties, so wallet
 *   popups and embeds keep working. Ignored by browsers that do not implement
 *   it, which simply means single-threaded WASM.
 * - `"require-corp"` — the classic `COOP: same-origin` + `COEP: require-corp`
 *   pair. Broadest support, but every cross-origin subresource must send CORP.
 * - `false` — send nothing; the SDK stays single-threaded in dev.
 */
export type CurvyIsolationMode = "credentialless" | "require-corp" | false;

export interface CurvyViteOptions {
  /** Dev/preview isolation headers. Default: `"credentialless"`. */
  crossOriginIsolation?: CurvyIsolationMode;
}

/** The subset of Vite config this plugin contributes. */
export interface CurvyViteConfig {
  optimizeDeps: { exclude: string[] };
  worker: { format: "es" };
  assetsInclude: string[];
  server?: { headers: Record<string, string> };
  preview?: { headers: Record<string, string> };
}

/** Structurally a Vite `Plugin`, without depending on a Vite major version. */
export interface CurvyVitePlugin {
  name: string;
  config(): CurvyViteConfig;
}

const ISOLATION_HEADERS: Record<Exclude<CurvyIsolationMode, false>, Record<string, string>> = {
  credentialless: { "Document-Isolation-Policy": "isolate-and-credentialless" },
  "require-corp": {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
  },
};

/**
 * Configure Vite for the Curvy SDK.
 *
 * ```ts
 * import { curvy } from "@0xcurvy/curvy-sdk/vite";
 *
 * export default defineConfig({ plugins: [react(), curvy()] });
 * ```
 *
 * What it sets, and why:
 *
 * - `optimizeDeps.exclude` for the SDK and its WASM package. The dep optimizer
 *   copies dependency code into `node_modules/.vite/deps/`, where the generated
 *   glue's `new URL("curvy_wasm_bg.wasm", import.meta.url)` and the worker URLs
 *   no longer point at anything. (Workspace-linked copies are never optimized,
 *   so this only bites once the SDK is installed from npm — i.e. for consumers.)
 * - `worker.format: "es"`. Rayon's helper dynamically imports the WASM module,
 *   and Vite's default `iife` worker format cannot code-split: without this the
 *   production build fails outright.
 * - `assetsInclude` for `.zkey`, so locally imported proving keys are emitted as
 *   assets rather than parsed as source.
 */
export function curvy(options: CurvyViteOptions = {}): CurvyVitePlugin {
  const { crossOriginIsolation = "credentialless" } = options;
  const headers = crossOriginIsolation === false ? undefined : ISOLATION_HEADERS[crossOriginIsolation];

  return {
    name: "curvy:sdk",
    config() {
      return {
        optimizeDeps: { exclude: ["@0xcurvy/curvy-sdk", "@0xcurvy/rs-core-wasm"] },
        worker: { format: "es" },
        assetsInclude: ["**/*.zkey"],
        ...(headers ? { server: { headers }, preview: { headers } } : {}),
      };
    },
  };
}

export default curvy;
