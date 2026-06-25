import { describe, expect, it } from "vitest";
import { accounts, createFakeConfig } from "@/test/fixtures";
import { hasActiveAccount } from "./hasActiveAccount";

describe("hasActiveAccount", () => {
  it("returns true when a account is active", () => {
    const config = createFakeConfig({
      accounts: { [accounts[0].id]: accounts[0] },
      activeAccountId: accounts[0].id,
    });

    expect(hasActiveAccount({ config })).toBe(true);
  });

  it("returns false when no account is active", () => {
    const config = createFakeConfig({ accounts: {}, activeAccountId: null });

    expect(hasActiveAccount({ config })).toBe(false);
  });
});
