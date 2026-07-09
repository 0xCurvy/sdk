import { createCurvyConfig } from "./createCurvyConfig";
import type { CreateCurvyConfigParameters, CurvyConfig } from "./types";

export type CreateServerCurvyConfigParameters = CreateCurvyConfigParameters;

/**
 * Server-friendly config defaults: no browser keystore and no ambient global.
 * Thread the returned config explicitly through actions to avoid cross-request
 * or cross-tenant bleed in long-lived processes.
 */
export function createServerCurvyConfig(parameters: CreateServerCurvyConfigParameters = {}): Promise<CurvyConfig> {
  const { enableKeystore = false, setAsActive = false, ...rest } = parameters;

  return createCurvyConfig({
    ...rest,
    enableKeystore,
    setAsActive,
  });
}
