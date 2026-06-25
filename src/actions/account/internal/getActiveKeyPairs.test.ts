import { describe, expect, it } from "vitest";
import { NoActiveAccountError } from "@/errors";
import { createFakeConfig, fakeCurvyAccount } from "@/test/fixtures";
import { getActiveKeyPairs } from "./getActiveKeyPairs";

describe("getActiveKeyPairs", () => {
  it("resolves the active account's keypairs", () => {
    const account = fakeCurvyAccount();
    const config = createFakeConfig({
      liveAccounts: new Map([[account.id, account]]),
      activeAccountId: account.id,
    });

    expect(getActiveKeyPairs(config)).toBe(account.keyPairs);
  });

  it("resolves an explicit accountId over the active one", () => {
    const active = fakeCurvyAccount({ keyPairs: { s: "aa".padStart(64, "0") } });
    const other = fakeCurvyAccount({ keyPairs: { s: "bb".padStart(64, "0") } });
    const config = createFakeConfig({
      liveAccounts: new Map([
        [active.id, active],
        [other.id, other],
      ]),
      activeAccountId: active.id,
    });

    expect(getActiveKeyPairs(config, other.id)).toBe(other.keyPairs);
  });

  it("throws NoActiveAccountError when there is no active account", () => {
    const config = createFakeConfig({ activeAccountId: null });
    expect(() => getActiveKeyPairs(config)).toThrow(NoActiveAccountError);
  });

  it("throws NoActiveAccountError when the id has no keyring entry", () => {
    const config = createFakeConfig({ activeAccountId: "missing" });
    expect(() => getActiveKeyPairs(config)).toThrow(NoActiveAccountError);
  });
});
