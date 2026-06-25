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
const computePrivateKeys = (r_string: string, s_string: string) => {
  const _r = BigInt(r_string);
  const _s = BigInt(s_string);

  const [s, v] = [hash([_s, _r]), hash([_r, _s])];

  invariant(s !== v, "Error generating keys: k === v !");

  return { s, v };
};

export { computePrivateKeys };
