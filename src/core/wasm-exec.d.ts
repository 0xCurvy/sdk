// Type stub for the Go WASM runtime shim. wasm-exec.js installs `globalThis.Go`
// as a side effect and exports nothing; this declaration lets Core.#initWasm
// `await import("./wasm-exec.js")` typecheck under noImplicitAny.
export {};
