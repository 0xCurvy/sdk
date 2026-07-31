import { encodeAbiParameters, keccak256 } from "viem";
import type { AggregatorSubmissionAction, RelayProofPayload, RelaySubmissionKeyMaterial } from "@/types/aggregator";
import type { HexString } from "@/types/helper";

const REQUEST_KEY_ABI = [
  { type: "uint8" },
  { type: "uint256" },
  { type: "uint256" },
  { type: "uint256[2]" },
  { type: "uint256[2][2]" },
  { type: "uint256[2]" },
  { type: "uint256[]" },
] as const;

const SPEND_KEY_ABI = [{ type: "uint256" }, { type: "uint256[]" }] as const;

const actionTag = (action: AggregatorSubmissionAction): number => (action === "aggregation" ? 0 : 1);

const proofValues = (proof: RelayProofPayload) => ({
  a: proof.a.map(BigInt) as [bigint, bigint],
  b: proof.b.map((row) => row.map(BigInt)) as [[bigint, bigint], [bigint, bigint]],
  c: proof.c.map(BigInt) as [bigint, bigint],
});

/**
 * Exact transport identity for one immutable relay payload. Reposting the same
 * built proof yields the same key; rebuilding/reproving yields a new one.
 */
export function deriveRelayRequestKey(material: RelaySubmissionKeyMaterial): HexString {
  const proof = proofValues(material.proof);
  return keccak256(
    encodeAbiParameters(REQUEST_KEY_ABI, [
      actionTag(material.action),
      BigInt(material.networkId),
      BigInt(material.maxInputs),
      proof.a,
      proof.b,
      proof.c,
      material.publicSignals.map(BigInt),
    ]),
  );
}

/** Extract the action-specific, non-padding nullifiers committed by a relay payload. */
export function relaySubmissionNullifiers(
  action: AggregatorSubmissionAction,
  maxInputs: number,
  publicSignals: readonly string[],
): bigint[] {
  const start = action === "withdrawal" ? 1 : 0;
  if (publicSignals.length < start + maxInputs) {
    throw new Error(
      `relay submission has ${publicSignals.length} public signals; ${action} with maxInputs=${maxInputs} needs at least ${start + maxInputs}`,
    );
  }
  const nullifiers = publicSignals
    .slice(start, start + maxInputs)
    .map(BigInt)
    .filter((value) => value !== 0n);
  if (nullifiers.length === 0) throw new Error("relay submission contains no non-padding nullifiers");
  return nullifiers;
}

/**
 * Stable spend identity across proof generations. Nullifiers are sorted so a
 * rebuild that reorders the same input notes remains in the same spend group.
 */
export function deriveRelaySpendKey(
  material: Pick<RelaySubmissionKeyMaterial, "action" | "networkId" | "maxInputs" | "publicSignals">,
): HexString {
  const nullifiers = relaySubmissionNullifiers(material.action, material.maxInputs, material.publicSignals).sort(
    (left, right) => (left < right ? -1 : left > right ? 1 : 0),
  );
  return keccak256(encodeAbiParameters(SPEND_KEY_ABI, [BigInt(material.networkId), nullifiers]));
}
