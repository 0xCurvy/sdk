import { sleep } from "@/utils/promise/sleep";

/** Poll until a criterion matches, enforcing one wall-clock deadline across calls and delays. */
export async function pollForCriteriaUntil<T>(
  pollFunction: (signal: AbortSignal) => Promise<T>,
  pollCriteria: (result: T) => boolean,
  timeoutMs: number,
  pollDelayMs = 10_000,
  timeoutError: Error = new Error("Polling deadline exceeded."),
): Promise<T> {
  const controller = new AbortController();
  const deadlineAt = Date.now() + timeoutMs;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort(timeoutError);
      reject(timeoutError);
    }, timeoutMs);
  });

  try {
    while (true) {
      const result = await Promise.race([pollFunction(controller.signal), deadline]);
      if (pollCriteria(result)) return result;

      const remainingMs = deadlineAt - Date.now();
      if (remainingMs <= 0) {
        controller.abort(timeoutError);
        throw timeoutError;
      }
      await Promise.race([sleep(Math.min(pollDelayMs, remainingMs)), deadline]);
    }
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }
}
