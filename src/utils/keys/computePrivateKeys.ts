import { hash } from "@/utils/hash/hash";
import { invariant } from "@/utils/invariant";

/**
 * Derive the deterministic spending (`s`) and viewing (`v`) private keys from a
 * SECP256k1 signature's `r` and `s` decimal-string components. The two keys are
 * the keccak-based `hash` of the (s, r) and (r, s) orderings respectively.
 *
 * @example
 * const { s, v } = computePrivateKeys(signature.r.toString(), signature.s.toString());
 *
 * @throws if the two derived keys collide (s === v).
 */
const computePrivateKeys = (rString: string, sString: string) => {
  const _r = BigInt(rString);
  const _s = BigInt(sString);

  const [s, v] = [hash([_s, _r]), hash([_r, _s])];

  invariant(s !== v, "Error generating keys: s === v !");

  return { s, v };
};

export { computePrivateKeys };
