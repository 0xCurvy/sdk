import { describe, expect, it } from "vitest";
import { decryptData } from "./decryptData";
import { encryptData } from "./encryptData";

describe("decryptData", () => {
  it("round-trips data encrypted by encryptData", async () => {
    const data = { hello: "world", n: 7 };
    const blob = await encryptData(data, "pw");
    expect(await decryptData(blob, "pw")).toBe(JSON.stringify(data));
  });

  it("fails to decrypt with the wrong password", async () => {
    const blob = await encryptData("top secret", "correct");
    await expect(decryptData(blob, "wrong")).rejects.toThrow();
  });

  it("throws 'Invalid encrypted data' when the envelope is missing fields", async () => {
    await expect(decryptData(JSON.stringify({ si: "00", n: "00" }), "pw")).rejects.toThrow("Invalid encrypted data");
  });

  it("throws on non-JSON input", async () => {
    await expect(decryptData("not-json", "pw")).rejects.toThrow();
  });
});
