import type { HexString } from "@/types/helper";

/**
 * Type guard that checks whether a string is a syntactically valid EVM address
 * (the literal `0x` prefix followed by exactly 40 hex characters).
 *
 * @example
 * isValidEvmAddress("0x" + "a".repeat(40)); // true
 * isValidEvmAddress("0x123");               // false
 */
const isValidEvmAddress = (recipient: string): recipient is HexString => {
  return /^0x[a-fA-F0-9]{40}$/.test(recipient);
};

export { isValidEvmAddress };
