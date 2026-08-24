// Node-side resolution of the WASM binaries that ship inside
// `@0xcurvy/rs-core-wasm`.
//
// Browsers never take this path: the wasm-bindgen glue locates its own binary
// with `new URL("curvy_wasm_bg.wasm", import.meta.url)`, which Vite, webpack and
// Rollup rewrite to a real emitted asset. Node cannot use that — `fetch` does
// not read `file:` URLs — so it hands the bytes to the initializer instead.

/** Read one of the packaged `.wasm` binaries, e.g. `.../core/curvy_wasm_bg.wasm`. */
export async function readPackagedWasm(specifier: string): Promise<Uint8Array<ArrayBuffer>> {
  const { readFile } = await import("node:fs/promises");
  // `process.getBuiltinModule` (Node >= 22.3, and the SDK requires >= 22.16)
  // rather than `import("node:module")`: a bundler would see that import and
  // externalize it into an empty browser stub, and this file is reached from
  // browser bundles even though only Node ever executes it.
  const { createRequire } = process.getBuiltinModule("node:module");
  // esbuild shims `import.meta.url` in the CJS output, so this resolves from the
  // emitted chunk under either module system — and `require.resolve` honours the
  // dependency's `exports` map, which lists every binary.
  const resolveFrom = createRequire(import.meta.url);
  // `Uint8Array.from` re-backs the bytes with a plain ArrayBuffer: Node's Buffer
  // is typed over ArrayBufferLike, which does not satisfy BufferSource.
  return Uint8Array.from(await readFile(resolveFrom.resolve(specifier)));
}

export const RS_CORE_WASM = "@0xcurvy/rs-core-wasm/core/curvy_wasm_bg.wasm";
export const RS_CORE_THREADS_WASM = "@0xcurvy/rs-core-wasm/core-threads/curvy_wasm_bg.wasm";
export const RS_PROVER_WASM = "@0xcurvy/rs-core-wasm/prover/curvy_prover_bg.wasm";
export const RS_PROVER_THREADS_WASM = "@0xcurvy/rs-core-wasm/prover-threads/curvy_prover_bg.wasm";
