import type { Currency, Network } from "@/types/api";
import { toSlug } from "@/utils/format/toSlug";

/**
 * Find a currency across `networks` by contract address (case-insensitive) or
 * by vault token id, scoped to a single network slug. Returns the matched
 * currency together with its parent network, or `undefined` if none matches.
 *
 * @example
 * const hit = findCurrency(networks, "0xA0b8…", "ethereum");
 * hit?.currency.symbol; // "USDC"
 */
export function findCurrency(
  networks: Network[],
  addressOrVaultTokenId: string | bigint,
  networkSlug: string,
): { currency: Currency; network: Network } | undefined {
  for (const network of networks) {
    if (toSlug(network.name) !== networkSlug) continue;

    const currency =
      typeof addressOrVaultTokenId === "bigint"
        ? network.currencies.find((c) => c.vaultTokenId === String(addressOrVaultTokenId))
        : network.currencies.find((c) => c.contractAddress.toLowerCase() === addressOrVaultTokenId.toLowerCase());

    if (currency) return { currency, network };
  }

  return undefined;
}
