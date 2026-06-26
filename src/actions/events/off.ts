import { resolveConfig } from "@/config/global";
import type { CurvyConfig } from "@/config/types";
import type { CURVY_EVENTS } from "@/types/events";

/**
 * Unsubscribe a previously-registered listener. Delegates to `config.emitter.off`.
 *
 * Emittery's `off` is IDENTITY-based — it removes by the same `listener`
 * reference passed to `on`, so the caller must hold and re-pass the original
 * function (or use the unsubscribe handle returned by `on`).
 *
 * `config` is the last, optional positional argument (the exception to the
 * single-options-bag rule, like the `watch*` actions).
 *
 * @example
 * off(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, listener);
 */
export function off<Name extends keyof CURVY_EVENTS>(
  eventName: Name,
  listener: (eventData: CURVY_EVENTS[Name]) => void | Promise<void>,
  config?: CurvyConfig,
): void {
  resolveConfig(config).emitter.off(eventName, listener);
}
