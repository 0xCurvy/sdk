import { afterEach, describe, expect, it } from "vitest";
import { setCurvyConfig } from "@/config/global";
import { createFakeConfig, fakeCurvyAccount } from "@/test/fixtures";
import { getActiveAccount } from "./getActiveAccount";
import { getActiveAccountId } from "./getActiveAccountId";

afterEach(() => setCurvyConfig(null));

describe("getActiveAccountId", () => {
  it("identifies a temporary account without making it a registered profile", () => {
    const account = fakeCurvyAccount({ curvyHandle: null, ownerAddress: null });
    const config = createFakeConfig({ activeAccountId: account.id, liveAccounts: new Map([[account.id, account]]) });
    setCurvyConfig(config);

    expect(getActiveAccountId()).toBe(account.id);
    expect(getActiveAccount()).toBeNull();
    expect(config.state.accounts).toEqual({});
  });

  it("uses an explicit config without changing the ambient selection", () => {
    setCurvyConfig(createFakeConfig({ activeAccountId: "ambient" }));
    const config = createFakeConfig({ activeAccountId: "explicit" });
    expect(getActiveAccountId({ config })).toBe("explicit");
    expect(getActiveAccountId()).toBe("ambient");
  });

  it("returns null when no account is selected", () => {
    expect(getActiveAccountId({ config: createFakeConfig() })).toBeNull();
  });
});
