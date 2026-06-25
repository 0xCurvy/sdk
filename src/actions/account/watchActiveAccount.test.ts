import { describe, expect, it } from "vitest";
import { accounts, createFakeConfig } from "@/test/fixtures";
import type { CurvyAccountData } from "@/types/account";
import { watchActiveAccount } from "./watchActiveAccount";

describe("watchActiveAccount", () => {
  it("fires with the new active account when activeAccountId changes", () => {
    const config = createFakeConfig({
      accounts: { [accounts[0].id]: accounts[0], [accounts[1].id]: accounts[1] },
      activeAccountId: accounts[0].id,
    });

    const received: (CurvyAccountData | null)[] = [];
    watchActiveAccount({ onChange: (account) => received.push(account), config });

    config.setState({ activeAccountId: accounts[1].id });

    expect(received).toEqual([accounts[1]]);
  });

  it("fires with null when the active account is cleared", () => {
    const config = createFakeConfig({
      accounts: { [accounts[0].id]: accounts[0] },
      activeAccountId: accounts[0].id,
    });

    const received: (CurvyAccountData | null)[] = [];
    watchActiveAccount({ onChange: (account) => received.push(account), config });

    config.setState({ activeAccountId: null });

    expect(received).toEqual([null]);
  });

  it("stops firing after unsubscribe", () => {
    const config = createFakeConfig({
      accounts: { [accounts[0].id]: accounts[0], [accounts[1].id]: accounts[1] },
      activeAccountId: accounts[0].id,
    });

    let calls = 0;
    const unsubscribe = watchActiveAccount({
      onChange: () => {
        calls += 1;
      },
      config,
    });

    config.setState({ activeAccountId: accounts[1].id });
    expect(calls).toBe(1);

    unsubscribe();
    config.setState({ activeAccountId: accounts[0].id });
    expect(calls).toBe(1);
  });
});
