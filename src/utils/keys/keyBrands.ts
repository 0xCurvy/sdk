import { SpendKeyRequiredError, ViewKeyRequiredError } from "@/errors";
import { type Brand, createBrand } from "@/utils/brand";

// Branded key types. A `SpendKey`/`ViewKey` is a `string` that has been checked
// to be non-empty, so a function that demands one cannot be handed a raw,
// possibly-empty key string by mistake. The account keypairs (`CurvyKeyPairs`)
// keep plain `string` fields — empty-string is a valid placeholder for an absent
// key — and `requireSpendKey`/`requireViewKey` are the single, validated bridge
// from those raw fields to the branded types that signing surfaces require.

export type SpendKey = Brand<string, "SpendKey">;
export type ViewKey = Brand<string, "ViewKey">;

/** Brander for spending keys: validates non-empty, throws {@link SpendKeyRequiredError}. */
export const SpendKey = createBrand<"SpendKey">({
  label: "spend key",
  validate: (s) => s.length > 0,
  onInvalid: () => new SpendKeyRequiredError(),
});

/** Brander for viewing keys: validates non-empty, throws {@link ViewKeyRequiredError}. */
export const ViewKey = createBrand<"ViewKey">({
  label: "view key",
  validate: (v) => v.length > 0,
  onInvalid: () => new ViewKeyRequiredError(),
});

/**
 * Read the spending key from a keypairs bag as a branded {@link SpendKey}.
 * Throws {@link SpendKeyRequiredError} if absent — turning "signed with an empty
 * key" from a silent crypto failure into a typed, early error.
 */
export const requireSpendKey = (keyPairs: { s: string }): SpendKey => SpendKey(keyPairs.s);

/** Read the viewing key from a keypairs bag as a branded {@link ViewKey}. Throws if absent. */
export const requireViewKey = (keyPairs: { v: string }): ViewKey => ViewKey(keyPairs.v);
