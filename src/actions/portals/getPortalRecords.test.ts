import { describe, expect, it, vi } from "vitest";
import { createFakeApi, createFakeConfig } from "@/test/fixtures";
import { getPortalRecords } from "./getPortalRecords";

describe("getPortalRecords", () => {
  it("delegates to api.portal.getPortalRecords and returns the page", async () => {
    const getPortalRecordsFn = vi.fn(async () => ({ portals: [], total: 42 }));
    const config = createFakeConfig({ api: createFakeApi({ portal: { getPortalRecords: getPortalRecordsFn } }) });

    const result = await getPortalRecords({ offset: 0, size: 200, config });

    expect(result).toEqual({ portals: [], total: 42 });
    expect(getPortalRecordsFn).toHaveBeenCalledWith({
      offset: 0,
      size: 200,
      startTime: undefined,
      endTime: undefined,
    });
  });

  it("forwards the time-range params", async () => {
    const getPortalRecordsFn = vi.fn(async () => ({ portals: [], total: 0 }));
    const config = createFakeConfig({ api: createFakeApi({ portal: { getPortalRecords: getPortalRecordsFn } }) });

    await getPortalRecords({ startTime: 100, endTime: 200, config });

    expect(getPortalRecordsFn).toHaveBeenCalledWith({
      offset: undefined,
      size: undefined,
      startTime: 100,
      endTime: 200,
    });
  });
});
