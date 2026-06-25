import { describe, expect, it } from "vitest";
import { NoActiveAccountError } from "@/errors";
import { accounts, createFakeConfig } from "@/test/fixtures";
import { resumeBalanceRefresh } from "./resumeBalanceRefresh";

describe("resumeBalanceRefresh", () => {
  it("throws NoActiveAccountError when no account is active and none provided", () => {
    const config = createFakeConfig({ activeAccountId: null });
    expect(() => resumeBalanceRefresh({ config })).toThrow(NoActiveAccountError);
  });

  it("clears the lock for the active account by default", () => {
    const accountId = accounts[0].id;
    const config = createFakeConfig({ activeAccountId: accountId });
    config._internal.scanLocks.set(`refresh-account-${accountId}`, true);

    resumeBalanceRefresh({ config });

    expect(config._internal.scanLocks.get(`refresh-account-${accountId}`)).toBe(false);
  });

  it("clears the lock for an explicit accountId", () => {
    const config = createFakeConfig({ activeAccountId: accounts[0].id });
    config._internal.scanLocks.set("refresh-account-account-z", true);

    resumeBalanceRefresh({ accountId: "account-z", config });

    expect(config._internal.scanLocks.get("refresh-account-account-z")).toBe(false);
  });
});
