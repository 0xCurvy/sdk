import { describe, expect, it } from "vitest";
import { NoActiveAccountError } from "@/errors";
import { createFakeConfig, fakeCurvyAccount } from "@/test/fixtures";
import { resolveAccount } from "./resolveAccount";

describe("resolveAccount", () => {
  it.each([true, false])("resolves identity and keys together (temporary: %s)", (temporary) => {
    const account = fakeCurvyAccount(temporary ? { curvyHandle: null, ownerAddress: null } : {});
    const config = createFakeConfig({ activeAccountId: account.id, liveAccounts: new Map([[account.id, account]]) });
    const registeredBefore = Object.keys(config.state.accounts);
    const result = resolveAccount(config);
    expect(result.id).toBe(account.id);
    expect(result.keyPairs).toBe(account.keyPairs);
    expect(Object.keys(config.state.accounts)).toEqual(registeredBefore);
  });

  it("honors an explicit account without switching the active account", () => {
    const account = fakeCurvyAccount();
    const config = createFakeConfig({ activeAccountId: "another", liveAccounts: new Map([[account.id, account]]) });
    expect(resolveAccount(config, account.id).id).toBe(account.id);
    expect(config.state.activeAccountId).toBe("another");
    expect(() => resolveAccount(config, "missing")).toThrow(NoActiveAccountError);
  });

  it.each([null, "missing"])("rejects unavailable accounts (%s)", (activeAccountId) => {
    const config = createFakeConfig({ activeAccountId });
    expect(() => resolveAccount(config)).toThrow(NoActiveAccountError);
  });
});
