import { describe, expect, it } from "vitest";
import { accounts, createFakeConfig } from "@/test/fixtures";
import { getAccounts } from "./getAccounts";

describe("getAccounts", () => {
  it("returns every account's metadata", () => {
    const config = createFakeConfig({
      accounts: { [accounts[0].id]: accounts[0], [accounts[1].id]: accounts[1] },
      activeAccountId: accounts[0].id,
    });

    const result = getAccounts({ config });

    expect(result).toHaveLength(2);
    expect(result.map((w) => w.id)).toEqual([accounts[0].id, accounts[1].id]);
  });

  it("returns an empty array when there are no accounts", () => {
    const config = createFakeConfig({ accounts: {}, activeAccountId: null });

    expect(getAccounts({ config })).toEqual([]);
  });
});
