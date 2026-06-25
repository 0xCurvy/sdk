import { describe, expect, it } from "vitest";
import { createFakeConfig } from "@/test/fixtures";
import { getScanProgress } from "./getScanProgress";

describe("getScanProgress", () => {
  it("returns the current scan progress from the store", () => {
    const config = createFakeConfig();
    expect(getScanProgress({ config })).toBe(0);

    config.setState({ scan: { status: "scanning", progress: 42 } });
    expect(getScanProgress({ config })).toBe(42);
  });
});
