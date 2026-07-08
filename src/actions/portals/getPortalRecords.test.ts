import { describe, expect, it, vi } from "vitest";
import { createFakeApi, createFakeConfig } from "@/test/fixtures";
import { getPortalRecords } from "./getPortalRecords";

describe("getPortalRecords", () => {
  it("delegates to api.portal.GetPortalRecords and returns the page", async () => {
    const getPortalRecordsFn = vi.fn(async () => ({ portals: [], nextCursor: "abc" }));
    const config = createFakeConfig({ api: createFakeApi({ portal: { GetPortalRecords: getPortalRecordsFn } }) });

    const result = await getPortalRecords({ cursor: "prev", limit: 200, config });

    expect(result).toEqual({ portals: [], nextCursor: "abc" });
    expect(getPortalRecordsFn).toHaveBeenCalledWith({
      cursor: "prev",
      limit: 200,
      startTime: undefined,
      endTime: undefined,
      direction: undefined,
    });
  });

  it("forwards the time-range + direction params", async () => {
    const getPortalRecordsFn = vi.fn(async () => ({ portals: [], nextCursor: null }));
    const config = createFakeConfig({ api: createFakeApi({ portal: { GetPortalRecords: getPortalRecordsFn } }) });

    await getPortalRecords({ startTime: 100, endTime: 200, direction: "newer", config });

    expect(getPortalRecordsFn).toHaveBeenCalledWith({
      cursor: undefined,
      limit: undefined,
      startTime: 100,
      endTime: 200,
      direction: "newer",
    });
  });
});
