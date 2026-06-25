import { describe, expect, it, vi } from "vitest";
import { NoActiveAccountError } from "@/errors";
import type { ICore } from "@/interfaces/core";
import { createFakeConfig, createFakeCore, fakeCurvyAccount } from "@/test/fixtures";
import { signMessageWithBabyJubjub } from "./signMessageWithBabyJubjub";

describe("signMessageWithBabyJubjub", () => {
  it("delegates to core with the message and the active account's spending key", async () => {
    const signature = { S: 1n, R8: [2n, 3n] };
    const core = createFakeCore({
      signWithBabyJubjubPrivateKey: vi.fn(async () => signature) as unknown as ICore["signWithBabyJubjubPrivateKey"],
    });
    const account = fakeCurvyAccount();
    const config = createFakeConfig({
      core,
      liveAccounts: new Map([[account.id, account]]),
      activeAccountId: account.id,
    });

    await expect(signMessageWithBabyJubjub({ config, message: 42n })).resolves.toBe(signature);
    expect(core.signWithBabyJubjubPrivateKey).toHaveBeenCalledWith(42n, account.keyPairs.s);
  });

  it("throws when no account is active", () => {
    const config = createFakeConfig({ activeAccountId: null });
    expect(() => signMessageWithBabyJubjub({ config, message: 1n })).toThrow(NoActiveAccountError);
  });
});
