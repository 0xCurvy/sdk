import type { CurrencyPrice, Network, ProtocolConfig } from "@/types/api";

/**
 * Re-attach the protocol-global proving config + fee collector onto each vault-enabled
 * network IN PLACE. The split `/networks` wire no longer carries these (they come from
 * `/protocol` once), but consumers still read `network.aggregationCircuitConfig` /
 * `network.feeCollector` off the `Network` object — so the bootstrap stamps them back on.
 */
const applyProtocol = (networks: Network[], protocol: ProtocolConfig): Network[] => {
  for (const network of networks) {
    if (!network.vaultContractAddress) continue;
    network.aggregationCircuitConfig = protocol.proving.aggregation;
    network.withdrawCircuitConfig = protocol.proving.withdrawal;
    network.noteOwnershipCircuitConfig = protocol.proving.noteOwnership;
    network.feeCollector = protocol.feeCollector;
  }
  return networks;
};

/**
 * Merge the lean `/prices` feed into each network's currencies IN PLACE (matched by
 * currency id), so price-reading consumers that look at `config.state.networks` (e.g.
 * gas-cost `resolvePrices`) see the bootstrap price snapshot on the `Currency` objects.
 */
const applyPrices = (networks: Network[], prices: CurrencyPrice[]): Network[] => {
  const byId = new Map(prices.map((p) => [p.id, p]));
  for (const network of networks) {
    for (const currency of network.currencies) {
      const p = byId.get(currency.id);
      if (!p) continue;
      currency.price = p.price;
      currency.updatedAt = p.updatedAt;
    }
  }
  return networks;
};

export { applyProtocol, applyPrices };
