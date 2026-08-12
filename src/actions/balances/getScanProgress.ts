import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";

export type GetScanProgressParameters = WithConfig;

/**
 * Read the current balance-scan progress from 0 to 100.
 *
 * @example
 * const pct = getScanProgress();
 */
export function getScanProgress(parameters: GetScanProgressParameters = {}): number {
  const config = resolveConfig(parameters.config);
  return config.state.scan.progress;
}
