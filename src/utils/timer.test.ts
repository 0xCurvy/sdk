import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultTimerProvider } from "./timer";

describe("defaultTimerProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules a recurring callback and stops it on cancel()", () => {
    vi.useFakeTimers();
    const provider = defaultTimerProvider();
    const callback = vi.fn();

    const handle = provider.setInterval(callback, 1000);
    vi.advanceTimersByTime(3000);
    expect(callback).toHaveBeenCalledTimes(3);

    handle.cancel();
    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(3); // no further ticks after cancel
  });
});
