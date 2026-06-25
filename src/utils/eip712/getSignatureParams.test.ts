import { verifyTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { getSignatureParams } from "./getSignatureParams";

describe("getSignatureParams", () => {
  it("builds the fixed Curvy Protocol AuthMessage typed-data domain and types", () => {
    const params = getSignatureParams("deadbeef");

    expect(params.primaryType).toBe("AuthMessage");
    expect(params.domain).toEqual({
      name: "Curvy Protocol",
      version: "1.0.0",
      chainId: 1,
    });
    expect(params.types).toEqual({
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
      ],
      AuthMessage: [
        { name: "title", type: "string" },
        { name: "content", type: "string" },
      ],
    });
  });

  it("embeds the message-to-sign into the AuthMessage content", () => {
    const params = getSignatureParams("abc123");

    expect(params.message).toEqual({
      title: "Curvy Protocol says 'Zdravo'!",
      content: "Curvy Protocol requests signature: abc123",
    });
  });

  it("is deterministic for the same input", () => {
    expect(getSignatureParams("xyz")).toEqual(getSignatureParams("xyz"));
  });

  it("varies the content with the message but keeps domain/types stable", () => {
    const a = getSignatureParams("one");
    const b = getSignatureParams("two");

    expect(a.message.content).not.toBe(b.message.content);
    expect(a.domain).toEqual(b.domain);
    expect(a.types).toEqual(b.types);
  });

  it("produces typed data a signature can be verified against (good/bad signer)", async () => {
    const privateKey = "0xe6bd304017a184efa0f577139772305c1a7b64c0e5f7b0a9b6aa6a255469157d";
    const account = privateKeyToAccount(privateKey);
    const other = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");

    const params = getSignatureParams("verify-me");
    // getSignatureParams `satisfies` the SDK's own typed-data param type; cast
    // at the viem boundary, whose stricter generic inference rejects the
    // non-`as const` `type` fields.
    const signature = await account.signTypedData(params as unknown as Parameters<typeof account.signTypedData>[0]);

    const good = await verifyTypedData({ ...params, address: account.address, signature } as unknown as Parameters<
      typeof verifyTypedData
    >[0]);
    const bad = await verifyTypedData({ ...params, address: other.address, signature } as unknown as Parameters<
      typeof verifyTypedData
    >[0]);

    expect(good).toBe(true);
    expect(bad).toBe(false);
  });
});
