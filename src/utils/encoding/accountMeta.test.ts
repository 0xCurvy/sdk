import { AccountRole, type Address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { accountMeta } from "@/utils/encoding/accountMeta";

const PUBKEY = "11111111111111111111111111111111" as Address;

describe("accountMeta", () => {
  it("maps (false, false) to READONLY", () => {
    expect(accountMeta(PUBKEY, false, false)).toEqual({ address: PUBKEY, role: AccountRole.READONLY });
  });

  it("maps (false, true) to WRITABLE", () => {
    expect(accountMeta(PUBKEY, false, true)).toEqual({ address: PUBKEY, role: AccountRole.WRITABLE });
  });

  it("maps (true, false) to READONLY_SIGNER", () => {
    expect(accountMeta(PUBKEY, true, false)).toEqual({ address: PUBKEY, role: AccountRole.READONLY_SIGNER });
  });

  it("maps (true, true) to WRITABLE_SIGNER", () => {
    expect(accountMeta(PUBKEY, true, true)).toEqual({ address: PUBKEY, role: AccountRole.WRITABLE_SIGNER });
  });

  it("preserves the supplied address", () => {
    expect(accountMeta(PUBKEY, false, false).address).toBe(PUBKEY);
  });
});
