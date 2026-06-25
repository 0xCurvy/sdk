import { describe, expect, it } from "vitest";
import { accounts, createFakeConfig } from "@/test/fixtures";
import { getAccountById } from "./getAccountById";

describe("getAccountById", () => {
  it("returns the account matching the id", () => {
    const config = createFakeConfig({
      accounts: { [accounts[0].id]: accounts[0] },
      activeAccountId: accounts[0].id,
    });

    expect(getAccountById({ id: accounts[0].id, config })).toBe(accounts[0]);
  });

  it("returns undefined for an unknown id", () => {
    const config = createFakeConfig({
      accounts: { [accounts[0].id]: accounts[0] },
      activeAccountId: accounts[0].id,
    });

    expect(getAccountById({ id: "missing", config })).toBeUndefined();
  });
});
