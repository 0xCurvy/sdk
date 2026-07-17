import { APIError, RelayError } from "@/errors";

/** True only when the relay service conclusively rejected the request before queueing it. */
export function isDefinitiveRelayRejection(error: unknown): boolean {
  if (!(error instanceof RelayError) || !(error.originalError instanceof APIError)) return false;
  const status = error.originalError.statusCode;
  return status !== undefined && status >= 400 && status < 500 && ![408, 409, 425, 429].includes(status);
}
