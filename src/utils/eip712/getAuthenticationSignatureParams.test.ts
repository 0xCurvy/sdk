import { verifyTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { getAuthenticationSignatureParams } from "./getAuthenticationSignatureParams";

const OWNER = "0x67fcb5316956053214374f37c53515ae3441b8ee";

describe("getAuthenticationSignatureParams", () => {
  it("returns the fixed Curvy Protocol AuthMessage typed-data shape", async () => {
    const params = await getAuthenticationSignatureParams(OWNER, "hunter2");

    expect(params.primaryType).toBe("AuthMessage");
    expect(params.domain).toEqual({
      name: "Curvy Protocol",
      version: "1.0.0",
      chainId: 1,
    });
    expect(params.types.AuthMessage).toEqual([
      { name: "title", type: "string" },
      { name: "content", type: "string" },
    ]);
    expect(params.message.title).toBe("Curvy Protocol says 'Zdravo'!");
    expect(params.message.content).toMatch(/^Curvy Protocol requests signature: [0-9a-f]{128}$/);
  });

  it("is deterministic for the same address and password", async () => {
    const a = await getAuthenticationSignatureParams(OWNER, "hunter2");
    const b = await getAuthenticationSignatureParams(OWNER, "hunter2");
    expect(a).toEqual(b);
  });

  it("normalises the address to its EIP-55 checksum (case-insensitive input)", async () => {
    const lower = await getAuthenticationSignatureParams(OWNER, "pw");
    const upper = await getAuthenticationSignatureParams(OWNER.toUpperCase().replace("0X", "0x"), "pw");
    expect(lower.message.content).toBe(upper.message.content);
  });

  it("changes the signed content when the password changes", async () => {
    const a = await getAuthenticationSignatureParams(OWNER, "pw-a");
    const b = await getAuthenticationSignatureParams(OWNER, "pw-b");
    expect(a.message.content).not.toBe(b.message.content);
  });

  it("changes the signed content when the address changes", async () => {
    const a = await getAuthenticationSignatureParams(OWNER, "pw");
    const b = await getAuthenticationSignatureParams("0x0b306bf915c4d645ff596e518faf3f9669b97016", "pw");
    expect(a.message.content).not.toBe(b.message.content);
  });

  it("produces typed data verifiable against the signer (good/bad)", async () => {
    const account = privateKeyToAccount("0xe6bd304017a184efa0f577139772305c1a7b64c0e5f7b0a9b6aa6a255469157d");
    const other = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");

    const params = await getAuthenticationSignatureParams(OWNER, "hunter2");
    const signature = await account.signTypedData(params);

    expect(await verifyTypedData({ ...params, address: account.address, signature })).toBe(true);
    expect(await verifyTypedData({ ...params, address: other.address, signature })).toBe(false);
  });
});
