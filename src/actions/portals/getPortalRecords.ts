import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { GetPortalRecordsReturnType } from "@/types/api";

export type GetPortalRecordsParameters = WithConfig<{
  offset?: number;
  size?: number;
  startTime?: number;
  endTime?: number;
}>;

/**
 * Fetch a page of global portal records. Delegates straight to the backend.
 *
 * @example
 * const { portals, total } = await getPortalRecords({ offset: 0, size: 200 });
 */
export async function getPortalRecords(
  parameters: GetPortalRecordsParameters = {},
): Promise<GetPortalRecordsReturnType> {
  const config = resolveConfig(parameters.config);
  const { offset, size, startTime, endTime } = parameters;
  return config.api.portal.getPortalRecords({ offset, size, startTime, endTime });
}
