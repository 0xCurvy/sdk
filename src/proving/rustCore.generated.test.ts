import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("generated threaded WASM glue", () => {
  it("preserves call-local arguments in fallible wasm-bindgen imports", () => {
    const glue = readFileSync(join(here, "_wasm_threads/curvy_wasm.js"), "utf8");

    expect(glue).toMatch(/__wbg_getRandomValues_[\da-f]+: function\(\) \{ return handleError\(function/);
    expect(glue).toMatch(/__wbg_randomFillSync_[\da-f]+: function\(\) \{ return handleError\(function/);
    expect(glue).not.toMatch(/__wbg_[\w]+:\s*\(\)\s*=>\s*handleError\([\s\S]{0,200}arguments\)/);
  });
});
