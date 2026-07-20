import { afterEach, describe, expect, it, vi } from "vitest";
import { pollForCriteriaUntil } from "./pollForCriteriaUntil";

describe("pollForCriteriaUntil", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns when a later poll meets the criterion", async () => {
    vi.useFakeTimers();
    const poll = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockResolvedValue("found");

    const result = pollForCriteriaUntil(poll, (value) => value !== undefined, 240_000, 10_000);
    await vi.advanceTimersByTimeAsync(20_000);

    await expect(result).resolves.toBe("found");
    expect(poll).toHaveBeenCalledTimes(3);
  });

  it("rejects at the wall-clock deadline and aborts an in-flight poll", async () => {
    vi.useFakeTimers();
    const timeoutError = new Error("deadline");
    let pollSignal: AbortSignal | undefined;
    const poll = vi.fn((signal: AbortSignal) => {
      pollSignal = signal;
      return new Promise<never>(() => undefined);
    });

    const result = pollForCriteriaUntil(poll, Boolean, 240_000, 10_000, timeoutError);
    const rejection = expect(result).rejects.toBe(timeoutError);
    await vi.advanceTimersByTimeAsync(240_000);

    await rejection;
    expect(pollSignal?.aborted).toBe(true);
  });
});
