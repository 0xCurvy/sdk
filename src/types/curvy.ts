import { CURVY_ID_DOMAINS } from "@/constants/curvy";
import { CURVY_ID_REGEX } from "@/constants/regex";

type CurvyIdDomain = (typeof CURVY_ID_DOMAINS)[number];
type CurvyId = `${string}${CurvyIdDomain}`;

const isValidCurvyIdDomain = (domain: string): domain is CurvyIdDomain => {
  return CURVY_ID_DOMAINS.includes(domain as CurvyIdDomain);
};
const isValidCurvyId = (handle: unknown): handle is CurvyId => {
  return typeof handle === "string" && CURVY_ID_REGEX.test(handle);
};
function assertCurvyId(handle: string): asserts handle is CurvyId {
  if (!isValidCurvyId(handle)) {
    throw new Error(`Invalid Curvy handle: ${handle}`);
  }
}

export { isValidCurvyId, isValidCurvyIdDomain, assertCurvyId, type CurvyId, type CurvyIdDomain };
