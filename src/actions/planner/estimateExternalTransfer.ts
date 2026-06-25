import { getQuote } from "@lifi/sdk";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { NETWORK_FLAVOUR } from "@/constants/networks";
import { LIFI_SOLANA_CHAIN_ID } from "@/constants/solana";
import type { Currency, Network } from "@/types";

// Bridge allowlists mirror the broadcaster's. Keep in sync with
// packages/backend/src/portal-broadcaster/portal-broadcaster.ts — drift here
// means our pre-deposit estimate disagrees with what the broadcaster actually
// routes through, by potentially more than just a few bps.
const LIFI_BRIDGES_EVM = ["gasZipBridge", "relaydepository", "across"];
// Solana entries are constrained to bridges whose calldata layout the
// on-chain extractor on the Solana side understands.
const LIFI_BRIDGES_SOLANA_ENTRY = ["across", "relaydepository"];
// Solana exits use a narrower set — only LiFi facets where the receiver lives
// at a predictable offset in the bridge-specific data blob.
const LIFI_BRIDGES_SOLANA_EXIT = ["across", "mayan", "near"];

// LiFi integrator fee Curvy applies on the entry bridge (matches the broadcaster's
// `fee: 0.001` arg). The exit leg currently isn't charged this fee.
const LIFI_INTEGRATOR_FEE_ENTRY = 0.001;

// LiFi rejects all-zero / system-program addresses with a "Zero address is provided"
// error, even for read-only quote calls. The numbers don't depend on the sender, so
// we just pick well-known non-zero values: the EVM "0xdEaD" burn address and the
// wrapped-SOL mint (which is non-zero in raw bytes despite looking like 1s).
const PLACEHOLDER_EVM_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const PLACEHOLDER_SOLANA_ADDRESS = "So11111111111111111111111111111111111111112";

export type EstimateExternalTransferArgs = {
  fromNetwork: Network;
  fromCurrency: Currency;
  fromAmount: bigint;
  toNetwork: Network;
  toCurrency: Currency;
};

export type EstimateExternalTransferResult = {
  /** Amount the user will receive at the destination, in `toCurrency`'s base units. */
  effectiveAmount: bigint;
  /** Currency on the shielding chain the deposit will arrive as. */
  bridgedCurrency: Currency;
  /** The network shielding actually happens on. */
  shieldingNetwork: Network;
  fees: {
    /** Entry-bridge fee in `fromCurrency` base units. 0 when no bridge is needed. */
    entryBridge: bigint;
    /** Curvy's protocol fee, taken on the shielded amount. In `bridgedCurrency` base units. */
    curvy: bigint;
    /** Exit-bridge fee in `bridgedCurrency` base units. 0 when no exit bridge is needed. */
    exitBridge: bigint;
  };
};

const lifiChainId = (network: Network): number => {
  if (network.flavour === NETWORK_FLAVOUR.SOLANA) return LIFI_SOLANA_CHAIN_ID;
  return Number(network.chainId);
};

const placeholderAddress = (network: Network): string =>
  network.flavour === NETWORK_FLAVOUR.SOLANA ? PLACEHOLDER_SOLANA_ADDRESS : PLACEHOLDER_EVM_ADDRESS;

const sumFeeCosts = (feeCosts: { amount: string }[] | undefined): bigint => {
  if (!feeCosts) return 0n;
  let total = 0n;
  for (const c of feeCosts) total += BigInt(c.amount);
  return total;
};

export type EstimateExternalTransferParameters = WithConfig<EstimateExternalTransferArgs>;

/**
 * Pre-deposit estimate for a swap-public-style external transfer.
 *
 * Models the full pipeline: entry bridge (source → shielding chain) → Curvy fee
 * on the shielded amount → exit bridge (shielding chain → destination). Returns
 * the projected delivered amount plus a per-leg fee breakdown. Either leg can
 * be skipped (returns 0) when the corresponding chain/currency matches the
 * shielding side.
 *
 * Uses the same LiFi bridge allowlist as the backend broadcaster, so the actual
 * route Curvy picks server-side should differ by at most a few bps from this
 * estimate.
 *
 * @example
 * const estimate = await estimateExternalTransfer({ fromNetwork, fromCurrency, fromAmount, toNetwork, toCurrency });
 */
export async function estimateExternalTransfer(
  parameters: EstimateExternalTransferParameters,
): Promise<EstimateExternalTransferResult> {
  const config = resolveConfig(parameters.config);
  const { fromNetwork, fromCurrency, fromAmount, toNetwork, toCurrency } = parameters;

  const shielding = config.state.activeNetworks.find((n) => !!n.aggregatorContractAddress);
  if (!shielding) throw new Error("No shielding-capable network is active.");
  if (!shielding.withdrawCircuitConfig) {
    throw new Error("Shielding network is missing withdrawCircuitConfig — cannot compute Curvy fee.");
  }

  // ── Entry leg ────────────────────────────────────────────────────────────────
  let bridgedCurrency: Currency;
  let entryBridgeFee = 0n;
  let amountAfterEntry: bigint;

  if (fromNetwork.id === shielding.id) {
    bridgedCurrency = fromCurrency;
    amountAfterEntry = fromAmount;
  } else {
    const bridgedId = fromCurrency.bridgeNetworkIdToCurrencyIdMap?.[shielding.id];
    if (!bridgedId) {
      throw new Error(`No bridge route from ${fromCurrency.symbol} on ${fromNetwork.name} to the shielding chain.`);
    }
    const bridged = shielding.currencies.find((c) => c.id === bridgedId);
    if (!bridged) {
      throw new Error(`Bridged currency id ${bridgedId} not found on the shielding chain.`);
    }
    bridgedCurrency = bridged;

    const entryBridges = fromNetwork.flavour === NETWORK_FLAVOUR.SOLANA ? LIFI_BRIDGES_SOLANA_ENTRY : LIFI_BRIDGES_EVM;

    const entryQuote = await getQuote({
      fromChain: lifiChainId(fromNetwork),
      toChain: lifiChainId(shielding),
      fromToken: fromCurrency.contractAddress,
      toToken: bridged.contractAddress,
      fromAmount: fromAmount.toString(),
      fromAddress: placeholderAddress(fromNetwork),
      fee: LIFI_INTEGRATOR_FEE_ENTRY,
      integrator: "Curvy-Staging",
      allowBridges: entryBridges,
    });

    entryBridgeFee = sumFeeCosts(entryQuote.estimate.feeCosts);
    amountAfterEntry = BigInt(entryQuote.estimate.toAmount);
  }

  // ── Curvy fee ────────────────────────────────────────────────────────────────
  const groupFee = BigInt(shielding.withdrawCircuitConfig.groupFee);
  const curvyFee = (amountAfterEntry * groupFee) / 1000n;
  const netAfterCurvy = amountAfterEntry - curvyFee;

  // ── Exit leg ─────────────────────────────────────────────────────────────────
  const sameChain = toNetwork.id === shielding.id;
  const sameCurrency = toCurrency.id === bridgedCurrency.id;

  if (sameChain && sameCurrency) {
    return {
      effectiveAmount: netAfterCurvy,
      bridgedCurrency,
      shieldingNetwork: shielding,
      fees: { entryBridge: entryBridgeFee, curvy: curvyFee, exitBridge: 0n },
    };
  }

  const exitBridges = toNetwork.flavour === NETWORK_FLAVOUR.SOLANA ? LIFI_BRIDGES_SOLANA_EXIT : LIFI_BRIDGES_EVM;

  const exitQuote = await getQuote({
    fromChain: lifiChainId(shielding),
    toChain: lifiChainId(toNetwork),
    fromToken: bridgedCurrency.contractAddress,
    toToken: toCurrency.contractAddress,
    fromAmount: netAfterCurvy.toString(),
    fromAddress: placeholderAddress(shielding),
    allowBridges: exitBridges,
  });

  return {
    effectiveAmount: BigInt(exitQuote.estimate.toAmount),
    bridgedCurrency,
    shieldingNetwork: shielding,
    fees: {
      entryBridge: entryBridgeFee,
      curvy: curvyFee,
      exitBridge: sumFeeCosts(exitQuote.estimate.feeCosts),
    },
  };
}
