import { createCurvyConfig } from "./createCurvyConfig";
import type { CreateCurvyConfigParameters, CurvyConfig } from "./types";

export type CreateBrowserCurvyConfigParameters = CreateCurvyConfigParameters;

/**
 * Browser-friendly config defaults: persistent IndexedDB storage plus
 * session-scoped key/JWT rehydration. The IndexedDB implementation is loaded
 * lazily so server consumers importing `@0xcurvy/curvy-sdk/config` do not pay
 * for Dexie unless they call this helper.
 */
export async function createBrowserCurvyConfig(
  parameters: CreateBrowserCurvyConfigParameters = {},
): Promise<CurvyConfig> {
  const { storage, enableKeystore = true, notesSyncEngine = "sharded", ...rest } = parameters;
  let resolvedStorage = storage;
  if (!resolvedStorage) {
    const { IndexedDBStorage } = await import("../storage/idb");
    resolvedStorage = new IndexedDBStorage();
  }

  return createCurvyConfig({
    ...rest,
    storage: resolvedStorage,
    enableKeystore,
    notesSyncEngine,
  });
}
