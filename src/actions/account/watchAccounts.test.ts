import { describe, expect, it } from "vitest";
import { accounts, createFakeConfig } from "@/test/fixtures";
import type { CurvyAccountData } from "@/types/account";
import { watchAccounts } from "./watchAccounts";

describe("watchAccounts", () => {
  it("fires with the updated account list when accounts change", () => {
    const config = createFakeConfig({
      accounts: { [accounts[0].id]: accounts[0] },
      activeAccountId: accounts[0].id,
    });

    const received: CurvyAccountData[][] = [];
    watchAccounts({ onChange: (accounts) => received.push(accounts), config });

    config.setState({ accounts: { [accounts[0].id]: accounts[0], [accounts[1].id]: accounts[1] } });

    expect(received).toHaveLength(1);
    expect(received[0]?.map((w) => w.id)).toEqual([accounts[0].id, accounts[1].id]);
  });

  it("stops firing after unsubscribe", () => {
    const config = createFakeConfig({ accounts: {}, activeAccountId: null });

    let calls = 0;
    const unsubscribe = watchAccounts({
      onChange: () => {
        calls += 1;
      },
      config,
    });

    config.setState({ accounts: { [accounts[0].id]: accounts[0] } });
    expect(calls).toBe(1);

    unsubscribe();
    config.setState({ accounts: { [accounts[0].id]: accounts[0], [accounts[1].id]: accounts[1] } });
    expect(calls).toBe(1);
  });
});
