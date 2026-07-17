import { describe, expect, it } from "vitest";
import { APIError, RelayError } from "@/errors";
import { isDefinitiveRelayRejection } from "./isDefinitiveRelayRejection";

describe("isDefinitiveRelayRejection", () => {
  it("accepts terminal client rejection and excludes ambiguous retry statuses", () => {
    expect(isDefinitiveRelayRejection(new RelayError("bad proof", new APIError("bad proof", 400)))).toBe(true);
    expect(isDefinitiveRelayRejection(new RelayError("conflict", new APIError("conflict", 409)))).toBe(false);
    expect(isDefinitiveRelayRejection(new RelayError("timeout", new APIError("timeout", 408)))).toBe(false);
    expect(isDefinitiveRelayRejection(new Error("network reset"))).toBe(false);
  });
});
