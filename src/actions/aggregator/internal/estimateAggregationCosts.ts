import type { CurvyConfig } from "@/config/types";
import { addBps, DEFAULT_SUBMIT_AGGREGATION_GAS_UNITS, gasCostInToken, resolveTokenPrices } from "@/gas";
import type { EvmRpc } from "@/rpc/evm";
import type { CurvyPublicKeys } from "@/types/core";
import { fetchAggregatorFees } from "./fetchAggregatorFees";

/**
 * The costs the SDK can determine for a planned aggregation, all denominated in
 * the aggregation's TOKEN (base units). Mirrors what the operator paymaster will
 * charge + what the protocol fee note must carry.
 */
export interface AggregationCostEstimate {
  /** The operator's keys, when a paymaster is available — address the gas note here. */
  operator?: CurvyPublicKeys;
  /**
   * Gas-reimbursement note amount: `submitAggregationGasInToken` over-provisioned
   * by `clientBufferBps` so a small price move before the relayer validates does
   * not cause a refusal. `0n` when no paymaster is available (submit yourself).
   */
  operatorFee: bigint;
  /** `submitAggregationRequest` gas cost in token base units (pre-buffer). */
  submitAggregationGasInToken: bigint;
  /**
   * The protocol fee the fee note must carry for `spentToOthers`:
   * `gasFee + floor(spentToOthers * protocolFeePerThousand / 1000)` (token base units).
   */
  protocolFee: bigint;

  // ── raw breakdown (transparency / UI) ──
  gasPriceWei: bigint;
  submitAggregationGasUnits: bigint;
  protocolFeePerThousand: bigint;
  gasFee: bigint;
  clientBufferBps: number;
}

export interface EstimateAggregationCostsParams {
  config: CurvyConfig;
  networkSlug: string;
  /** The aggregation token (vault token id) — `inputNotes[0].token`. */
  token: bigint;
  /** Sum of amounts sent to recipients (excludes change), for the protocol fee. */
  spentToOthers?: bigint;
}

/**
 * Determine, in the aggregation's token: (1) the operator gas-reimbursement note
 * amount for `submitAggregationRequest`, (2) the amortized commit cost, and (3)
 * the protocol fee. Native gas price + the operator's gas-unit estimate come from
 * `GET /relay/paymaster` when reachable (keeping the client's number close to what
 * the relayer enforces); otherwise it falls back to the on-chain gas price and the
 * default baseline. Prices are read from the same `Currency.price` feed the SDK
 * already refreshes.
 *
 * When no paymaster is reachable, `operator` is `undefined` and `operatorFee` is
 * `0n` — the caller then submits on-chain itself (no gas note) rather than relay.
 */
export async function estimateAggregationCosts(
  params: EstimateAggregationCostsParams,
): Promise<AggregationCostEstimate> {
  const { config, networkSlug, token, spentToOthers = 0n } = params;
  const network = config.state.networks.find((n) => n.slug === networkSlug);
  if (!network) throw new Error(`estimateAggregationCosts: unknown network "${networkSlug}"`);

  const { protocolFeePerThousand, gasFee } = await fetchAggregatorFees(config, networkSlug);
  const protocolFee = gasFee + (spentToOthers * protocolFeePerThousand) / 1000n;

  // Operator's current view (keys + gas), if a paymaster is running. Best-effort:
  // a missing endpoint just means "no paymaster" — size nothing, submit yourself.
  let operator: CurvyPublicKeys | undefined;
  let submitAggregationGasUnits = DEFAULT_SUBMIT_AGGREGATION_GAS_UNITS;
  let gasPriceWei: bigint | undefined;
  let clientBufferBps = 0;
  try {
    const info = await config.api.relay.GetPaymasterInfo();
    operator = info.operator;
    submitAggregationGasUnits = BigInt(info.submitAggregationGasUnits);
    gasPriceWei = BigInt(info.gasPriceWei);
    clientBufferBps = info.clientBufferBps;
  } catch {
    operator = undefined;
  }

  // Fall back to the chain's gas price if the paymaster didn't supply one.
  if (gasPriceWei === undefined) {
    const rpc = config.getRpc().Network(network.id) as EvmRpc;
    gasPriceWei = await rpc.provider.getGasPrice();
  }

  const prices = resolveTokenPrices(network, token);
  const conv = (gasUnits: bigint): bigint =>
    gasCostInToken({
      gasUnits,
      gasPriceWei: gasPriceWei as bigint,
      nativeUsd: prices.nativeUsd,
      tokenUsd: prices.tokenUsd,
      nativeDecimals: prices.nativeDecimals,
      tokenDecimals: prices.tokenDecimals,
    });

  const submitAggregationGasInToken = conv(submitAggregationGasUnits);
  const operatorFee = operator ? addBps(submitAggregationGasInToken, clientBufferBps) : 0n;

  return {
    operator,
    operatorFee,
    submitAggregationGasInToken,
    protocolFee,
    gasPriceWei,
    submitAggregationGasUnits,
    protocolFeePerThousand,
    gasFee,
    clientBufferBps,
  };
}
