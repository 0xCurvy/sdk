import { getProtocol } from "@/config/protocol";
import type { CurvyConfig } from "@/config/types";
import type { CircuitId, ZKArtifact } from "@/proving/prover";

/**
 * Resolve a circuit's proving artifacts (wasm + zkey) for a network from the
 * `CircuitConfig` the backend advertises via GetNetworks — the single source of
 * truth for which keys + dimensions a network's deployed circuit uses. No keys
 * are bundled in the SDK.
 *
 * `s3://<bucket>/<key>` paths are rewritten to `${circuitKeysBaseUrl}/<key>` (a
 * client cannot fetch `s3://`); plain paths / `https` URLs pass through. Pass the
 * spend's `networkSlug`, or omit it to use the single active network.
 */
export function resolveCircuitArtifacts(
  config: CurvyConfig,
  kind: CircuitId,
  networkSlug?: string,
): { wasm: ZKArtifact; zkey: ZKArtifact; maxInputs: number; maxOutputs: number; treeDepth: number } {
  const slug = networkSlug ?? config.state.activeNetworks[0]?.slug;
  const network = config.state.networks.find((n) => n.slug === slug);
  if (!network) throw new Error(`prove: no network "${slug ?? "(none active)"}" to resolve ${kind} circuit artifacts`);

  const proving = getProtocol({ config }).proving;
  const circuitConfig = kind === "aggregation" ? proving.aggregation : proving.withdrawal;
  if (!circuitConfig?.wasmPath || !circuitConfig?.zkeyPath) {
    throw new Error(`prove: protocol has no ${kind} circuit config (missing wasmPath/zkeyPath)`);
  }

  return {
    wasm: resolveKeyUri(config, circuitConfig.wasmPath),
    zkey: resolveKeyUri(config, circuitConfig.zkeyPath),
    maxInputs: circuitConfig.maxInputs,
    maxOutputs: circuitConfig.maxOutputs,
    treeDepth: circuitConfig.treeDepth,
  };
}

/** Map an `s3://bucket/key` URI to `${circuitKeysBaseUrl}/key`; pass others through. */
function resolveKeyUri(config: CurvyConfig, uri: string): string {
  if (!uri.startsWith("s3://")) return uri; // local path or https URL
  if (!config.circuitKeysBaseUrl) {
    throw new Error(
      `prove: circuit key "${uri}" is an s3:// URI but no circuitKeysBaseUrl is configured — ` +
        "pass createCurvyConfig({ circuitKeysBaseUrl: 'https://…' }) so keys can be fetched.",
    );
  }
  return uri.replace(/^s3:\/\/[^/]+\//, `${config.circuitKeysBaseUrl.replace(/\/+$/, "")}/`);
}
