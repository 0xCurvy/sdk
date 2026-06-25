import { parseSignature } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import type { EvmSignatureData } from "@/types";
import { getSignatureParams } from "@/utils/eip712/getSignatureParams";
import { verifyEvmSignature } from "./verifyEvmSignature";

const PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

async function buildSignatureData(): Promise<EvmSignatureData> {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const signatureParams = getSignatureParams("deadbeef");
  // getSignatureParams `satisfies` the SDK's own typed-data param type; cast at
  // the viem boundary, whose stricter generic inference rejects the non-`as
  // const` `type` fields.
  const signatureResult = await account.signTypedData(
    signatureParams as unknown as Parameters<typeof account.signTypedData>[0],
  );

  return {
    signingAddress: account.address,
    signatureParams,
    signatureResult,
  };
}

describe("verifyEvmSignature", () => {
  it("returns the [r, s] components of a valid signature", async () => {
    const data = await buildSignatureData();
    const expected = parseSignature(data.signatureResult);

    const [r, s] = await verifyEvmSignature(data);

    expect(r).toBe(expected.r);
    expect(s).toBe(expected.s);
  });

  it("throws when the signature result is not a hex string", async () => {
    const data = await buildSignatureData();
    await expect(
      verifyEvmSignature({ ...data, signatureResult: "not-hex" as unknown as `0x${string}` }),
    ).rejects.toThrow("Invalid signature result");
  });

  it("throws when the signature does not match the signing address", async () => {
    const data = await buildSignatureData();
    const otherAddress = privateKeyToAccount(
      "0x0000000000000000000000000000000000000000000000000000000000000002",
    ).address;

    await expect(verifyEvmSignature({ ...data, signingAddress: otherAddress })).rejects.toThrow(
      "Signature verification failed. Invalid signature.",
    );
  });
});
