// Importing the threaded bindings registers wasm-bindgen-rayon's worker-init
// listener. This entry is bundled without shared chunks so it is worker-safe.
import initWasm, { initThreadPool, wbg_rayon_start_worker } from "./_wasm_threads/curvy_wasm.js";

if (
  typeof initWasm !== "function" ||
  typeof initThreadPool !== "function" ||
  typeof wbg_rayon_start_worker !== "function"
) {
  throw new Error("Threaded Rust core bootstrap is unavailable");
}
