// The sharded tree has a synchronous application-facing API backed by WASM.
// Load the shared Rust module once before tests, mirroring createCurvyConfig().
import { initCore } from "@/proving/rustCore";

await initCore();
