import type { ProtocolConfig } from "@/types/api";
import { resolveConfig } from "./global";
import type { WithConfig } from "./types";

/**
 * The protocol-global config — proving parameters + fee collector — from the active config's
 * state (ambient by default; pass `config` to override). Loaded ONCE by `createCurvyConfig`
 * from `GET /protocol`; this is the single source consumers read (it is NOT stamped onto each
 * network). Throws if it isn't loaded yet — proving/fee ops can't proceed without it.
 */
export function getProtocol(parameters: WithConfig = {}): ProtocolConfig {
  const protocol = resolveConfig(parameters.config).state.protocol;
  if (!protocol) {
    throw new Error("Curvy protocol config is not loaded — createCurvyConfig() must complete before proving/fee ops.");
  }
  return protocol;
}
