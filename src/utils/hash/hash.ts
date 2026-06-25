import { concat, keccak256 } from "viem";
import type { HexString } from "@/types/helper";
import { invariant } from "@/utils/invariant";

/**
 * Keccak256-based key-derivation hash. Concatenates the big-endian hex encodings
 * of the inputs, hashes them, then trims/zero-pads the digest to a fixed 252-bit
 * field-friendly string (leading "0"). Validates the result falls within the
 * allowed bit-length and magnitude window.
 *
 * @example
 * hash([1n, 2n]); // deterministic 63-char string beginning with "0"
 *
 * @throws if the hashed value is over 252 bits, under 180 bits, or below 10^70.
 */
const hash = (_values: bigint[]) => {
  const values = _values.map<HexString>(
    (v) => `0x${v.toString(16).length % 2 === 0 ? v.toString(16) : `0${v.toString(16)}`}`,
  );
  const MAX_OUTPUT_LENGTH = 252;
  const MIN_OUTPUT_LENGTH = 180;
  const MIN_VALID_VALUE = 10n ** 70n;

  const preImage = concat(values);
  const hashed = keccak256(preImage).replace("0x", "").slice(1);

  invariant(hashed.length * 4 <= MAX_OUTPUT_LENGTH, `Error generating hash: length over ${MAX_OUTPUT_LENGTH} bits`);

  invariant(hashed.length * 4 >= MIN_OUTPUT_LENGTH, `Error generating hash: length under ${MIN_OUTPUT_LENGTH} bits`);

  invariant(BigInt(`0x${hashed}`) >= MIN_VALID_VALUE, `Error generating hash: hashed value under ${MIN_VALID_VALUE}`);

  return `0${hashed.padStart(MAX_OUTPUT_LENGTH / 4, "0")}`;
};

export { hash };
