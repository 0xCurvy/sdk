import { describe, expect, it } from "vitest";
import { NoActiveAccountError } from "@/errors";
import { accounts, createFakeConfig } from "@/test/fixtures";
import { pauseBalanceRefresh } from "./pauseBalanceRefresh";

describe("pauseBalanceRefresh", () => {
  it("throws NoActiveAccountError when no account is active and none provided", () => {
    const config = createFakeConfig({ activeAccountId: null });
    expect(() => pauseBalanceRefresh({ config })).toThrow(NoActiveAccountError);
  });

  it("sets the lock for the active account by default", () => {
    const accountId = accounts[0].id;
    const config = createFakeConfig({ activeAccountId: accountId });

    pauseBalanceRefresh({ config });

    expect(config._internal.scanLocks.get(`refresh-account-${accountId}`)).toBe(true);
  });

  it("sets the lock for an explicit accountId", () => {
    const config = createFakeConfig({ activeAccountId: accounts[0].id });

    pauseBalanceRefresh({ accountId: "account-z", config });

    expect(config._internal.scanLocks.get("refresh-account-account-z")).toBe(true);
  });
});
