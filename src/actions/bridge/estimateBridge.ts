import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { BridgeEstimate, BridgeEstimateRequestBody } from "@/types/api";

export type EstimateBridgeParameters = WithConfig<BridgeEstimateRequestBody>;

/**
 * Quote a bridge/swap before committing — for the swap UI (in-app/public) and send-with-exit-bridge.
 * Returns the SAME plan + carve the portal-broadcaster will execute, so the UI can show an accurate
 * "you send `fromAmount` → recipient receives at least `toAmountMin`; bridge cost = `carve` (+
 * `nativeFeeWei`)". Amounts are returned as bigint base units.
 *
 * @example
 * const q = await estimateBridge({
 *   fromChainId, toChainId, fromToken, toToken,
 *   fromAmount: amount.toString(), fromAddress: portalAddress,
 * });
 * // q.toAmountMin → minimum the recipient receives
 */
export async function estimateBridge(parameters: EstimateBridgeParameters): Promise<BridgeEstimate> {
  const config = resolveConfig(parameters.config);
  const { config: _config, ...body } = parameters;

  const data = await config.api.bridge.Estimate(body);

  return {
    tool: data.tool,
    fromAmount: BigInt(data.fromAmount),
    bridgedAmount: BigInt(data.bridgedAmount),
    carve: BigInt(data.carve),
    nativeFeeWei: BigInt(data.nativeFeeWei),
    toAmountMin: BigInt(data.toAmountMin),
  };
}
