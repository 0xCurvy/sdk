// Adapted from https://github.com/alexreardon/tiny-invariant — the `process`
// reference is guarded so it is safe in browser / `platform: neutral` runtimes
// where no bundler has inlined `process.env.NODE_ENV`.
const isProduction: boolean = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
const prefix = "Invariant failed";

/**
 * Assert that `condition` is truthy, [narrowing](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions)
 * its type for the rest of the scope. Throws an `Error` when it is falsy.
 *
 * In production the message is stripped (only the prefix is thrown) to keep
 * bundles small; pass a function for messages that are expensive to compute.
 *
 * @example
 * invariant(account, "Expected an active account");
 * // `account` is now narrowed to non-nullable
 */
export function invariant(condition: unknown, message?: string | (() => string)): asserts condition {
  if (condition) return;

  // In production we strip the (potentially expensive / revealing) message.
  if (isProduction) throw new Error(prefix);

  const provided = typeof message === "function" ? message() : message;
  throw new Error(provided ? `${prefix}: ${provided}` : prefix);
}
