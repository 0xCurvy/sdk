import { describe, expect, it } from "vitest";
import { accounts, createFakeConfig } from "@/test/fixtures";
import { getActiveAccount } from "./getActiveAccount";

describe("getActiveAccount", () => {
  it("returns the active account's metadata", () => {
    const config = createFakeConfig({
      accounts: { [accounts[0].id]: accounts[0] },
      activeAccountId: accounts[0].id,
    });

    expect(getActiveAccount({ config })).toBe(accounts[0]);
  });

  it("returns null when no account is active", () => {
    const config = createFakeConfig({
      accounts: { [accounts[0].id]: accounts[0] },
      activeAccountId: null,
    });

    expect(getActiveAccount({ config })).toBeNull();
  });

  it("returns null when the active id has no matching account", () => {
    const config = createFakeConfig({ accounts: {}, activeAccountId: "missing" });

    expect(getActiveAccount({ config })).toBeNull();
  });
});
