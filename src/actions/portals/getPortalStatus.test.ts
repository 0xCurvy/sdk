import { describe, expect, it, vi } from "vitest";
import { createFakeApi, createFakeConfig } from "@/test/fixtures";
import type { PortalStatusResponse } from "@/types/api";
import { getPortalStatus } from "./getPortalStatus";

describe("getPortalStatus", () => {
  it("delegates to api.portal.getPortalStatus and returns the status", async () => {
    const status: PortalStatusResponse = {
      type: "entry",
      state: "completed",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    };
    const getPortalStatusFn = vi.fn(async () => status);
    const config = createFakeConfig({ api: createFakeApi({ portal: { getPortalStatus: getPortalStatusFn } }) });

    const result = await getPortalStatus({ address: "0x00000000000000000000000000000000000000aa", config });

    expect(result).toEqual(status);
    expect(getPortalStatusFn).toHaveBeenCalledWith("0x00000000000000000000000000000000000000aa");
  });

  it("returns null when the api reports no portal", async () => {
    const getPortalStatusFn = vi.fn(async () => null);
    const config = createFakeConfig({ api: createFakeApi({ portal: { getPortalStatus: getPortalStatusFn } }) });

    const result = await getPortalStatus({ address: "0xdoesnotexist", config });

    expect(result).toBeNull();
  });
});
