import { describe, expect, it } from "vitest";
import { accounts, createFakeConfig } from "@/test/fixtures";
import { hasAccount } from "./hasAccount";

describe("hasAccount", () => {
  it("returns true for a known account id", () => {
    const config = createFakeConfig({
      accounts: { [accounts[0].id]: accounts[0] },
      activeAccountId: accounts[0].id,
    });

    expect(hasAccount({ id: accounts[0].id, config })).toBe(true);
  });

  it("returns false for an unknown account id", () => {
    const config = createFakeConfig({
      accounts: { [accounts[0].id]: accounts[0] },
      activeAccountId: accounts[0].id,
    });

    expect(hasAccount({ id: "missing", config })).toBe(false);
  });
});
