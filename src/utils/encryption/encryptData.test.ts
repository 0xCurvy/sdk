import { describe, expect, it } from "vitest";
import { decryptData } from "./decryptData";
import { encryptData } from "./encryptData";

describe("encryptData", () => {
  it("produces a JSON envelope with hex ciphertext, nonce, and salt", async () => {
    const blob = await encryptData({ secret: 42 }, "pw");
    const parsed = JSON.parse(blob) as { si: string; n: string; so: string };
    expect(parsed).toHaveProperty("si");
    expect(parsed).toHaveProperty("n");
    expect(parsed).toHaveProperty("so");
    expect(parsed.si).toMatch(/^[0-9a-f]+$/);
    expect(parsed.n).toMatch(/^[0-9a-f]{24}$/); // 12-byte IV
    expect(parsed.so).toMatch(/^[0-9a-f]{64}$/); // 32-byte salt
  });

  it("round-trips: ciphertext decrypts back to the serialized plaintext", async () => {
    const data = { secret: 42, nested: ["a", "b"] };
    const blob = await encryptData(data, "pw");
    expect(await decryptData(blob, "pw")).toBe(JSON.stringify(data));
  });

  it("uses a random IV/salt so the same plaintext yields different ciphertext", async () => {
    const a = await encryptData("same", "pw");
    const b = await encryptData("same", "pw");
    expect(a).not.toBe(b);
    // but both still decrypt to the same value
    expect(await decryptData(a, "pw")).toBe(await decryptData(b, "pw"));
  });
});
