import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { GetPortalRecordsReturnType } from "@/types/api";

export type GetPortalRecordsParameters = WithConfig<{
  /** Opaque keyset cursor from a previous page's `nextCursor`. Omit for the first page. */
  cursor?: string;
  /** Max records to return (server caps at 200). */
  limit?: number;
  startTime?: number;
  endTime?: number;
  /** "older" = newest-first (default); "newer" = ascending from the cursor (incremental scan). */
  direction?: "older" | "newer";
}>;

/**
 * Fetch a page of global portal records via keyset pagination. Pass the previous page's `nextCursor`
 * to continue; iterate until `nextCursor` is null.
 *
 * @example
 * let cursor: string | undefined;
 * do {
 *   const { portals, nextCursor } = await getPortalRecords({ cursor, limit: 200 });
 *   // ...process portals...
 *   cursor = nextCursor ?? undefined;
 * } while (cursor);
 */
export async function getPortalRecords(
  parameters: GetPortalRecordsParameters = {},
): Promise<GetPortalRecordsReturnType> {
  const config = resolveConfig(parameters.config);
  const { cursor, limit, startTime, endTime, direction } = parameters;
  return config.api.portal.GetPortalRecords({ cursor, limit, startTime, endTime, direction });
}
