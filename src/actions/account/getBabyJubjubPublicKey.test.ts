import { describe, expect, it, vi } from "vitest";
import { NoActiveAccountError } from "@/errors";
import { createFakeConfig, createFakeCore, fakeCurvyAccount } from "@/test/fixtures";
import { getBabyJubjubPublicKey } from "./getBabyJubjubPublicKey";

describe("getBabyJubjubPublicKey", () => {
  it("delegates to core with the active account's spending key", async () => {
    const core = createFakeCore({ getBabyJubjubPublicKey: vi.fn(async () => "bjj-pub") });
    const account = fakeCurvyAccount();
    const config = createFakeConfig({
      core,
      liveAccounts: new Map([[account.id, account]]),
      activeAccountId: account.id,
    });

    await expect(getBabyJubjubPublicKey({ config })).resolves.toBe("bjj-pub");
    expect(core.getBabyJubjubPublicKey).toHaveBeenCalledWith(account.keyPairs.s);
  });

  it("resolves an explicit accountId", async () => {
    const core = createFakeCore({ getBabyJubjubPublicKey: vi.fn(async () => "bjj-pub") });
    const account = fakeCurvyAccount({ keyPairs: { s: "ss".padStart(64, "0") } });
    const config = createFakeConfig({
      core,
      liveAccounts: new Map([[account.id, account]]),
      activeAccountId: null,
    });

    await getBabyJubjubPublicKey({ config, accountId: account.id });
    expect(core.getBabyJubjubPublicKey).toHaveBeenCalledWith(account.keyPairs.s);
  });

  it("throws when no account is active", () => {
    const config = createFakeConfig({ activeAccountId: null });
    expect(() => getBabyJubjubPublicKey({ config })).toThrow(NoActiveAccountError);
  });
});
