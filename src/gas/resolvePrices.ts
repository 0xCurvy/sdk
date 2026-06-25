import type { Currency, Network } from "@/types/api";
import { parseUsdPrice } from "./gasCostInToken";

/** The native + token USD prices (fixed-point) + decimals needed for a conversion. */
export interface ResolvedTokenPrices {
  nativeUsd: bigint;
  tokenUsd: bigint;
  nativeDecimals: number;
  tokenDecimals: number;
  /** The matched token currency (e.g. for its symbol/decimals in UI). */
  tokenCurrency: Currency;
  /** The matched native currency. */
  nativeCurrency: Currency;
}

/** Find the currency in `network` whose `vaultTokenId` matches a note's `token`. */
export function findCurrencyByVaultTokenId(network: Network, vaultTokenId: bigint): Currency | undefined {
  return network.currencies.find((c) => c.vaultTokenId != null && BigInt(c.vaultTokenId) === vaultTokenId);
}

/**
 * Resolve the native-token and output-token USD prices for a gas→token conversion.
 * `token` is the note's `token` field (the vault token id). Throws if the network
 * has no native currency, the token is unknown, or either price is unset/zero — an
 * unpriced token must be treated as "cannot quote", not "free".
 */
export function resolveTokenPrices(network: Network, token: bigint): ResolvedTokenPrices {
  const nativeCurrency = network.currencies.find((c) => c.nativeCurrency);
  if (!nativeCurrency) throw new Error(`resolveTokenPrices: network "${network.slug}" has no native currency`);
  const tokenCurrency = findCurrencyByVaultTokenId(network, token);
  if (!tokenCurrency) {
    throw new Error(`resolveTokenPrices: no currency on "${network.slug}" with vaultTokenId ${token}`);
  }
  if (nativeCurrency.price == null) throw new Error(`resolveTokenPrices: native currency has no price`);
  if (tokenCurrency.price == null) {
    throw new Error(`resolveTokenPrices: token "${tokenCurrency.symbol}" has no price`);
  }
  return {
    nativeUsd: parseUsdPrice(nativeCurrency.price),
    tokenUsd: parseUsdPrice(tokenCurrency.price),
    nativeDecimals: nativeCurrency.decimals,
    tokenDecimals: tokenCurrency.decimals,
    tokenCurrency,
    nativeCurrency,
  };
}
