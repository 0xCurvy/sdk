import { Buffer } from "buffer";
import { encode } from "@/utils/common";

/**
 * Derives a deterministic, hex-encoded password hash using PBKDF2-SHA256
 * (600,000 iterations) with the supplied hex salt.
 *
 * @example
 * const hash = await computePasswordHash("hunter2", "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff");
 * // hash === (await computePasswordHash("hunter2", "0011...eeff")) // deterministic
 */
const computePasswordHash = async (password: string, salt: string) => {
  const key = await crypto.subtle.importKey("raw", encode(password), { name: "PBKDF2", hash: "SHA-256" }, false, [
    "deriveBits",
  ]);

  const saltBuffer = Buffer.from(salt, "hex");

  return Buffer.from(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBuffer,
        iterations: 600_000,
        hash: "SHA-256",
      },
      key,
      256,
    ),
  ).toString("hex");
};

export { computePasswordHash };
