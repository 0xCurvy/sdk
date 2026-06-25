import { NoCurvyConfigError } from "@/errors";
import type { CurvyConfig } from "./types";

/**
 * The ambient/global config. `createCurvyConfig` sets this so
 * actions can be called without threading `config` through every call. Multiple
 * configs are supported: pass `config` explicitly to override, or swap the
 * global with `setCurvyConfig`.
 */
let activeConfig: CurvyConfig | null = null;

/** Register (or clear) the global config. */
export function setCurvyConfig(config: CurvyConfig | null): void {
  activeConfig = config;
}

/** Get the global config, throwing if none is set. */
export function getCurvyConfig(): CurvyConfig {
  if (!activeConfig) throw new NoCurvyConfigError();
  return activeConfig;
}

/** Get the global config without throwing. */
export function peekCurvyConfig(): CurvyConfig | null {
  return activeConfig;
}

/**
 * Resolve the config for an action: an explicit override wins, otherwise the
 * ambient global (throws `NoCurvyConfigError` if neither is available).
 */
export function resolveConfig(config?: CurvyConfig): CurvyConfig {
  return config ?? getCurvyConfig();
}
