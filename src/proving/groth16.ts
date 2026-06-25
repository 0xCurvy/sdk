import type { Groth16Proof } from "snarkjs";

/** A groth16 proof formatted for the on-chain `verifyProof(pA, pB, pC, ...)` ABI. */
export type SolidityProof = {
  proofA: [bigint, bigint];
  proofB: [[bigint, bigint], [bigint, bigint]];
  proofC: [bigint, bigint];
};

/**
 * snarkjs groth16 proof -> Solidity verifier (a, b, c). Note the G2 (`pi_b`)
 * coordinate swap the snarkjs-generated verifier expects. Shared by every proof
 * builder (aggregation, withdrawal, folded fee-pool, drain) so the swap is
 * written exactly once.
 */
export function formatGroth16ProofForSolidity(proof: Groth16Proof): SolidityProof {
  return {
    proofA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
    proofB: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ],
    proofC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
  };
}
