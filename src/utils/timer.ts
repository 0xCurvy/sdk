/**
 * A started timer that can be cancelled. The injectable seam that lets a host
 * swap `setInterval` for an environment-appropriate scheduler — e.g. an MV3
 * browser extension can back this with `chrome.alarms`, whose timers survive
 * service-worker termination (a raw `setInterval` does not).
 */
export type TimerHandle = { cancel(): void };

export type TimerProvider = {
  setInterval(callback: () => void, ms: number): TimerHandle;
  /** Optional one-shot scheduler. Existing interval-only providers remain valid. */
  setTimeout?(callback: () => void, ms: number): TimerHandle;
};

/** The default provider — wraps `globalThis.setInterval` / `clearInterval`. */
export function defaultTimerProvider(): TimerProvider {
  return {
    setInterval(callback, ms) {
      const id = globalThis.setInterval(callback, ms);
      return { cancel: () => globalThis.clearInterval(id) };
    },
    setTimeout(callback, ms) {
      const id = globalThis.setTimeout(callback, ms);
      return { cancel: () => globalThis.clearTimeout(id) };
    },
  };
}

export function sleepWithTimerProvider(provider: TimerProvider, ms: number): Promise<void> {
  if (!provider.setTimeout) {
    return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
  }
  return new Promise((resolve) => provider.setTimeout?.(resolve, ms));
}
