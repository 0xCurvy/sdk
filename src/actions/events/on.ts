import { resolveConfig } from "@/config/global";
import type { CurvyConfig } from "@/config/types";
import type { ICurvyEventEmitter } from "@/interfaces/events";

type OnParams = Parameters<ICurvyEventEmitter["on"]>;
type OnEventName = OnParams[0];
type OnListener = OnParams[1];
type Unsubscribe = ReturnType<ICurvyEventEmitter["on"]>;

export type OnOptions = {
  /** Override the ambient global config. */
  config?: CurvyConfig;
  /**
   * Bind the subscription's lifetime to an `AbortSignal`: when it aborts, the
   * listener is removed automatically — no explicit `off()` needed. Handled
   * natively by Emittery (it also detaches the abort handler if you unsubscribe
   * manually first, and no-ops when the signal is already aborted).
   */
  signal?: AbortSignal;
};

/**
 * Subscribe to a Curvy event. Delegates to `config.emitter.on` and returns
 * Emittery's identity-based unsubscribe function.
 *
 * `eventName` and `listener` stay positional (Emittery's natural shape); the
 * trailing options bag carries `config` and an optional `signal` for
 * abort-driven auto-cleanup (passed straight through to Emittery).
 *
 * @example
 * const unsubscribe = on(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, (e) => {});
 * // later: unsubscribe();
 *
 * @example
 * // Auto-cleanup via AbortSignal — no manual off():
 * on(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, (e) => {}, { signal: controller.signal });
 */
export function on(eventName: OnEventName, listener: OnListener, options: OnOptions = {}): Unsubscribe {
  const { config, signal } = options;
  return resolveConfig(config).emitter.on(eventName, listener, { signal });
}
