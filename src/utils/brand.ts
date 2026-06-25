// Nominal ("branded") types.
//
// A `Brand<T, B>` is structurally `T` at runtime but assignment-incompatible
// with a bare `T` — or a differently-branded `T` — at compile time. That lets a
// function demand a *validated* value (e.g. a non-empty spend key) and have the
// compiler reject any raw, unchecked `string` passed in its place. The brand
// marker is a phantom (`declare`d) symbol, so a branded value carries ZERO
// runtime footprint — it is just the underlying `T`.
//
// Pair the `Brand<T, B>` type alias with `createBrand` to get an ergonomic
// constructor + guard + assertion + unchecked escape hatch in two lines, so
// adding a new branded type costs almost no boilerplate:
//
// @example
// export type SpendKey = Brand<string, "SpendKey">;
// export const SpendKey = createBrand<"SpendKey">({ label: "spend key", validate: (s) => s.length > 0 });
//
// SpendKey("ab12");     // validates, returns SpendKey — throws if invalid
// SpendKey.is(raw);     // type guard: raw is SpendKey
// SpendKey.assert(raw); // narrows `raw` to SpendKey — throws if invalid
// SpendKey.unsafe(raw); // brand WITHOUT validating (trusted / freshly-derived values)

declare const brand: unique symbol;

/** A nominal type: `T` tagged with the compile-time-only brand `B`. */
export type Brand<T, B extends string> = T & { readonly [brand]: B };

/** Recover the underlying (unbranded) type of a branded type. */
export type Unbrand<T> = T extends Brand<infer U, string> ? U : T;

/** The runtime + type toolkit for a single branded type, produced by {@link createBrand}. */
export type Brander<B extends string, T = string> = {
  /** Validate (when a validator was provided) then brand. Throws on invalid input. */
  (value: T): Brand<T, B>;
  /** Type guard: does `value` satisfy the brand's invariant? */
  is(value: T): value is Brand<T, B>;
  /** Assertion form of {@link Brander.is}: narrows `value` in place. Throws on invalid input. */
  assert(value: T): asserts value is Brand<T, B>;
  /** Brand WITHOUT validating — escape hatch for values known to be valid (e.g. freshly derived). */
  unsafe(value: T): Brand<T, B>;
};

export type CreateBrandOptions<T> = {
  /** Human-readable name used in the default error message (e.g. `"spend key"`). */
  label?: string;
  /** Runtime invariant. Omit for a pure compile-time brand (every value is accepted). */
  validate?: (value: T) => boolean;
  /** Build the error thrown on invalid input (overrides the default `Invalid <label>` message). */
  onInvalid?: (value: T) => Error;
};

/**
 * Build a {@link Brander} for a nominal type. The base type defaults to `string`;
 * pass a second type argument for other bases (`createBrand<"PositiveInt", number>`).
 */
export function createBrand<B extends string, T = string>(options: CreateBrandOptions<T> = {}): Brander<B, T> {
  const { label = "value", validate, onInvalid } = options;

  const cast = (value: T) => value as unknown as Brand<T, B>;
  const fail = (value: T) => onInvalid?.(value) ?? new Error(`Invalid ${label}`);
  const is = (value: T): value is Brand<T, B> => (validate ? validate(value) : true);

  const make = ((value: T) => {
    if (validate && !validate(value)) throw fail(value);
    return cast(value);
  }) as Brander<B, T>;

  make.is = is;
  make.unsafe = cast;
  // An assertion signature can't be inferred from an expression, so attach via cast.
  make.assert = ((value: T) => {
    if (validate && !validate(value)) throw fail(value);
  }) as Brander<B, T>["assert"];

  return make;
}
