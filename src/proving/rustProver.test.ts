import { describe, expect, it } from "vitest";
import { createRustProver } from "./rustProver";

describe("createRustProver", () => {
  it("refuses an unauthenticated proving key before loading artifacts", async () => {
    const prover = createRustProver();
    await expect(prover.prove({}, new Uint8Array(), new Uint8Array())).rejects.toThrow(/CircuitConfig\.zkeySha256/);
  });

  it("cannot be reused after its parsed-key cache is destroyed", async () => {
    const prover = createRustProver();
    await prover.destroy?.();
    await expect(prover.prove({}, new Uint8Array(), new Uint8Array(), { zkeySha256: "00".repeat(32) })).rejects.toThrow(
      /destroyed/,
    );
  });
});
