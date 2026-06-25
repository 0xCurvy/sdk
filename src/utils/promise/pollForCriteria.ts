import { sleep } from "@/utils/promise/sleep";

/**
 *  * Polls a function until the criteria is met or max retries is reached.
 *
 * @param pollFunction
 * @param pollCriteria
 * @param {number} [pollAttempts=120] - Maximum number of retries
 * @param {number} [pollDelay=10_000] - Delay between retries in milliseconds
 * @param {(pollAttempt: number, error: unknown) => boolean} [shouldRetry] - Optional function to determine if a retry should be attempted after an error
 */
async function pollForCriteria<T>(
  pollFunction: () => Promise<T>,
  pollCriteria: (res: T) => boolean,
  pollAttempts = 120,
  pollDelay = 10000,
  shouldRetry?: (pollAttempt: number, error: unknown) => boolean,
): Promise<T> {
  for (let pollAttempt = 0; pollAttempt < pollAttempts; pollAttempt++) {
    try {
      const res = await pollFunction();

      if (pollCriteria(res)) {
        return res;
      }
    } catch (error) {
      if (!shouldRetry?.(pollAttempt, error)) {
        throw error;
      }
    }

    await sleep(pollDelay);
  }

  throw new Error(`Polling failed!`);
}

export { pollForCriteria };
