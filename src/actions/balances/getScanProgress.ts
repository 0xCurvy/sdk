import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";

export type GetScanProgressParameters = WithConfig;

/**
 * Read the current balance-scan progress (0–100) from the store (port of
 * `BalanceScanner.totalScanProgress`, now sourced from `state.scan.progress`).
 *
 * @example
 * const pct = getScanProgress();
 */
export function getScanProgress(parameters: GetScanProgressParameters = {}): number {
  const config = resolveConfig(parameters.config);
  return config.state.scan.progress;
}
