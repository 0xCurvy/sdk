import { verifyTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { expect, test } from "vitest";

test("Unit test for signatures", async () => {
  const privateKey = "0xe6bd304017a184efa0f577139772305c1a7b64c0e5f7b0a9b6aa6a255469157d";
  const version = "1.0";
  const chainId = 31337;
  const verifyingContract = "0x9a676e781a523b5d0c0e43731313a708cb607508";

  const nonce = 0n;
  const from = "0x67fcb5316956053214374f37c53515aE3441b8EE";
  const to = "0x0b306bf915c4d645ff596e518faf3f9669b97016";
  const tokenId = 1n;
  const amount = 998999905426735528144n;
  const gasFee = 0n;
  const metaTransactionType = 1;

  const account = privateKeyToAccount(privateKey);

  // TODO: Zasto je Typescript jezik u kome kada prosledim ovo direktno kao argument literal lepo razume, ali kao promenljivu buni se?
  // @ts-expect-error
  const _eip712Data = {
    domain: {
      name: "Curvy Privacy Vault",
      version,
      chainId,
      verifyingContract,
    },
    primaryType: "CurvyMetaTransactionType",
    types: {
      CurvyMetaTransactionType: [
        { name: "nonce", type: "uint256" },
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "amount", type: "uint256" },
        { name: "gasFee", type: "uint256" },
        { name: "metaTransactionType", type: "uint8" },
      ],
    },
    message: {
      nonce,
      from,
      to,
      tokenId,
      amount,
      gasFee,
      metaTransactionType,
    },
  };

  const signature = await account.signTypedData({
    domain: {
      name: "Curvy Privacy Vault",
      version,
      chainId,
      verifyingContract,
    },
    primaryType: "CurvyMetaTransactionType",
    types: {
      CurvyMetaTransactionType: [
        { name: "nonce", type: "uint256" },
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "amount", type: "uint256" },
        { name: "gasFee", type: "uint256" },
        { name: "metaTransactionType", type: "uint8" },
      ],
    },
    message: {
      nonce,
      from,
      to,
      tokenId,
      amount,
      gasFee,
      metaTransactionType,
    },
  });

  const goodSignature = await verifyTypedData({
    address: from,
    domain: {
      name: "Curvy Privacy Vault",
      version,
      chainId,
      verifyingContract,
    },
    primaryType: "CurvyMetaTransactionType",
    types: {
      CurvyMetaTransactionType: [
        { name: "nonce", type: "uint256" },
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "amount", type: "uint256" },
        { name: "gasFee", type: "uint256" },
        { name: "metaTransactionType", type: "uint8" },
      ],
    },
    message: {
      nonce,
      from,
      to,
      tokenId,
      amount,
      gasFee,
      metaTransactionType,
    },

    signature,
  });

  const badSignature = await verifyTypedData({
    address: to,
    domain: {
      name: "Curvy Privacy Vault",
      version,
      chainId,
      verifyingContract,
    },
    primaryType: "CurvyMetaTransactionType",
    types: {
      CurvyMetaTransactionType: [
        { name: "nonce", type: "uint256" },
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "amount", type: "uint256" },
        { name: "gasFee", type: "uint256" },
        { name: "metaTransactionType", type: "uint8" },
      ],
    },
    message: {
      nonce,
      from,
      to,
      tokenId,
      amount,
      gasFee,
      metaTransactionType,
    },

    signature,
  });

  expect(goodSignature).toBe(true);
  expect(badSignature).toBe(false);
});
