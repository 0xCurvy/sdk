import { describe, expect, it } from "vitest";
import { computePasswordHash } from "./computePasswordHash";

const SALT = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";

describe("computePasswordHash", () => {
  it("is deterministic for a fixed password + salt", async () => {
    const a = await computePasswordHash("hunter2", SALT);
    const b = await computePasswordHash("hunter2", SALT);
    expect(a).toBe(b);
  });

  it("produces a 64-char (256-bit) hex string", async () => {
    const hash = await computePasswordHash("hunter2", SALT);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes with the password", async () => {
    const a = await computePasswordHash("hunter2", SALT);
    const b = await computePasswordHash("hunter3", SALT);
    expect(a).not.toBe(b);
  });

  it("changes with the salt", async () => {
    const a = await computePasswordHash("hunter2", SALT);
    const b = await computePasswordHash("hunter2", "ff".repeat(32));
    expect(a).not.toBe(b);
  });
});
