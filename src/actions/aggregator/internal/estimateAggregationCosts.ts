import type { CurvyConfig } from "@/config/types";
import type { CurvyPublicKeys } from "@/core/types";
import { FeeEstimateUnavailableError, NetworkError } from "@/errors";
import { addBps, gasCostInToken, resolveTokenPrices } from "@/gas";
import { fetchAggregatorFees } from "./fetchAggregatorFees";

/** Inputs needed by the authoritative aggregation allocation calculation. */
export interface AggregationCostEstimate {
  /** The relay operator that receives `relayFee`; absent for direct submission. */
  operator?: CurvyPublicKeys;
  /** Relay gas reimbursement in token base units. */
  relayFee: bigint;
  /** Per-token pending-note commitment fee. */
  commitmentFee: bigint;
  /** Protocol rate applied by `computeAggregateDelivery`. */
  protocolFeePerThousand: bigint;
}

export interface EstimateAggregationCostsParams {
  config: CurvyConfig;
  networkSlug: string;
  /** Aggregation token (vault token id). */
  token: bigint;
  /** Direct submissions do not create a relay reimbursement output. */
  submissionMode?: "relay" | "direct";
}

/**
 * Load the inputs needed to allocate an aggregation. Relay estimates require a
 * current paymaster quote; direct estimates do not contact the paymaster.
 */
export async function estimateAggregationCosts(
  params: EstimateAggregationCostsParams,
): Promise<AggregationCostEstimate> {
  const { config, networkSlug, token } = params;
  const submissionMode = params.submissionMode ?? config.submissionMode;
  const network = config.state.networks.find((n) => n.slug === networkSlug);
  if (!network) throw new NetworkError(`Unknown network "${networkSlug}".`, networkSlug);

  const { protocolFeePerThousand, commitmentGasCosts } = await fetchAggregatorFees(config, networkSlug);
  const commitmentFee = commitmentGasCosts[Number(token)] ?? 0n;
  if (submissionMode === "direct") {
    return { commitmentFee, protocolFeePerThousand, relayFee: 0n };
  }

  const info = await config.api.relay.GetPaymasterInfo(network.chainId).catch((error) => {
    throw new FeeEstimateUnavailableError("The relay paymaster did not provide current fee terms.", { cause: error });
  });
  try {
    const prices = resolveTokenPrices(network, token);
    const submitGasInToken = gasCostInToken({
      gasUnits: BigInt(info.submitAggregationGasUnits),
      gasPriceWei: BigInt(info.gasPriceWei),
      nativeUsd: prices.nativeUsd,
      tokenUsd: prices.tokenUsd,
      nativeDecimals: prices.nativeDecimals,
      tokenDecimals: prices.tokenDecimals,
    });
    return {
      operator: info.operator,
      relayFee: addBps(submitGasInToken, info.clientBufferBps),
      commitmentFee,
      protocolFeePerThousand,
    };
  } catch (error) {
    throw new FeeEstimateUnavailableError("Could not convert the relay gas quote into the aggregation token.", {
      cause: error,
    });
  }
}
