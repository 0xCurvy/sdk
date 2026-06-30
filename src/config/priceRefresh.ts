import { PRICE_UPDATE_INTERVAL } from "@/constants/intervals";
import { pricesToPriceData } from "@/utils";
import { invariant } from "@/utils/invariant";
import type { CurvyConfig } from "./types";

/**
 * Poll the latest prices into storage. Hits the lean `/prices` feed (not the full
 * `/networks` registry), so the recurring refresh is cheap and doesn't re-pull contract
 * addresses + bridge maps every tick.
 */
export async function refreshPrices(config: CurvyConfig): Promise<void> {
  const prices = await config.api.network.GetPrices();
  const priceData = pricesToPriceData(prices);
  if (priceData.size === 0) {
    console.warn("Could not fetch any price data, skipping price update.");
    return;
  }
  await config.storage.upsertPriceData(priceData);
}

/**
 * Start the recurring price-refresh timer (port of `CurvySDK.#startPriceIntervalUpdate`).
 * Throws if one is already running.
 */
export function startPriceRefresh(
  config: CurvyConfig,
  { runImmediately = false }: { runImmediately?: boolean } = {},
): void {
  invariant(!config._internal.timers.price, "Price refresh interval is already started!");
  if (runImmediately) void refreshPrices(config);
  config._internal.timers.price = config._internal.timerProvider.setInterval(() => {
    void refreshPrices(config);
  }, PRICE_UPDATE_INTERVAL);
}

/** Stop the recurring price-refresh timer (port of `CurvySDK.#stopPriceIntervalUpdate`). */
export function stopPriceRefresh(config: CurvyConfig): void {
  if (config._internal.timers.price) {
    config._internal.timers.price.cancel();
    config._internal.timers.price = undefined;
  }
}
