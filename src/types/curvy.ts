import { CURVY_HANDLE_DOMAINS } from "@/constants/curvy";
import { CURVY_HANDLE_REGEX } from "@/constants/regex";

type CurvyHandleDomain = (typeof CURVY_HANDLE_DOMAINS)[number];
type CurvyHandle = `${string}${CurvyHandleDomain}`;

const isValidCurvyHandleDomain = (domain: string): domain is CurvyHandleDomain => {
  return CURVY_HANDLE_DOMAINS.includes(domain as CurvyHandleDomain);
};
const isValidCurvyHandle = (handle: unknown): handle is CurvyHandle => {
  return typeof handle === "string" && CURVY_HANDLE_REGEX.test(handle);
};
function assertCurvyHandle(handle: string): asserts handle is CurvyHandle {
  if (!isValidCurvyHandle(handle)) {
    throw new Error(`Invalid Curvy handle: ${handle}`);
  }
}

export { isValidCurvyHandle, isValidCurvyHandleDomain, assertCurvyHandle, type CurvyHandle, type CurvyHandleDomain };
