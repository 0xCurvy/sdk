import { describe, expect, it } from "vitest";
import { NoActiveAccountError } from "@/errors";
import { accounts, createFakeConfig, fakeBalanceEntry } from "@/test/fixtures";
import { CURVY_EVENT_TYPES } from "@/types/events";
import { getBalances } from "./getBalances";

describe("getBalances", () => {
  it("returns cached entries for the active account without scanning", async () => {
    const accountId = accounts[0].id;
    const config = createFakeConfig({ activeAccountId: accountId });
    await config.storage.updateBalanceEntries(accountId, "ethereum", [fakeBalanceEntry({ accountId })]);

    const balances = await getBalances({ config });

    expect(balances).toHaveLength(1);
    expect(balances[0]?.accountId).toBe(accountId);
  });

  it("targets an explicit accountId override", async () => {
    const active = accounts[0].id;
    const other = accounts[1].id;
    const config = createFakeConfig({ activeAccountId: active });
    await config.storage.updateBalanceEntries(other, "ethereum", [
      fakeBalanceEntry({ accountId: other, id: "note-other" }),
    ]);

    const balances = await getBalances({ accountId: other, config });

    expect(balances).toHaveLength(1);
    expect(balances[0]?.accountId).toBe(other);
  });

  it("throws NoActiveAccountError when no account is active and none provided", async () => {
    const config = createFakeConfig({ activeAccountId: null });
    await expect(getBalances({ config })).rejects.toBeInstanceOf(NoActiveAccountError);
  });

  it("refreshes before reading when cached is false", async () => {
    const accountId = accounts[0].id;
    const config = createFakeConfig({ activeAccountId: accountId });

    let started = 0;
    config.emitter.on(CURVY_EVENT_TYPES.BALANCE_REFRESH_STARTED, () => {
      started += 1;
    });

    await getBalances({ cached: false, config });

    expect(started).toBe(1);
  });
});
