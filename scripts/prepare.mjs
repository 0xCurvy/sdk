// `prepare` runs on every `pnpm install`. The service/frontend Docker images
// install dependencies from a manifests-only layer (package.json files, no
// src/) so the layer stays cached across source-only commits — skip the build
// there; turbo builds the SDK exactly once in a later layer. Locally and on
// publish (src/ present) keep building, so a fresh clone gets a usable dist
// without an explicit build step.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

if (existsSync(new URL("../src", import.meta.url))) {
  execSync("pnpm run build", { stdio: "inherit" });
} else {
  console.log("[@0xcurvy/curvy-sdk] prepare: src/ absent (manifests-only install) — skipping build");
}
