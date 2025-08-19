import { ethers } from "ethers";
import { encodeAbiParameters, keccak256 } from "viem";
import type { CsucActionPayload, CsucActionType, CsucSignature } from "@/types/csuc";

export const hashActionPayload = (
  chainId: string,
  payload: CsucActionPayload,
  totalFee: string,
  nonce: string,
): string => {
  const actionId = getOnchainActionId(payload);
  const { token, amount, parameters } = JSON.parse(payload.encodedData) as any;

  const viemValues = [
    BigInt(chainId),
    {
      token,
      actionId,
      amount,
      totalFee: BigInt(totalFee),
      limit: 10_000_000_000n, // TODO: check with contract requirements
      parameters: parameters || "0x",
    },
    BigInt(nonce),
  ];

  const encodedData = encodeAbiParameters(
    [
      {
        name: "_chainId",
        type: "uint256",
      },
      {
        name: "payload",
        type: "tuple",
        internalType: "struct CSUC_Types.ActionPayload",
        components: [
          {
            name: "token",
            type: "address",
            internalType: "address",
          },
          {
            name: "actionId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "amount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "totalFee",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "limit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "parameters",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
      {
        name: "_nonce",
        type: "uint256",
      },
    ],
    viemValues as any,
  );

  return keccak256(encodedData);
};

// Convert CSUC.ActionType to a hash representation for the contract
export const getOnchainActionId = (payload: CsucActionPayload): bigint => {
  const hash = (id: string) => {
    const encoded = encodeAbiParameters([{ type: "string" }], [id]);

    return BigInt(keccak256(encoded));
  };

  const at = payload.actionType as CsucActionType;

  if (at.type === "transfer") {
    return hash("CSUC_TRANSFER_ACTION_ID");
  }
  if (at.type === "withdraw") {
    return hash("CSUC_WITHDRAWAL_ACTION_ID");
  }
  if (at.type === "deposit-to-aggregator") {
    return hash("AGGREGATOR_ACTION_HANDLER");
  }
  throw new Error("CSUC:EVM:signActionPayload - Unsupported CSUC action type for conversion!");
};

export const signActionPayload = async (
  chainId: string,
  payload: CsucActionPayload,
  totalFee: string,
  nonce: string,
  privateKey: `0x${string}`,
): Promise<CsucSignature> => {
  const rawMessage = hashActionPayload(chainId, payload, totalFee, nonce);

  // Viem doesn't create signature correctly!
  //---------------------------------------------------
  // const account = privateKeyToAccount(privateKey);
  // const signatureHex = await account.signMessage({
  //     raw: rawMessage,
  // });
  // const { r, s, v } = parseSignature(signatureHex);

  // Ethers used insted
  // ---------------------------------------------------
  const account = new ethers.Wallet(privateKey);
  const signatureHex = account.signingKey.sign(rawMessage);
  const { r, s, v } = ethers.Signature.from(signatureHex);

  // Double check if the signature was generated correctly
  const recoveredAddress: string = ethers.computeAddress(ethers.SigningKey.recoverPublicKey(rawMessage, { r, s, v }));
  const expectedAddress: string = await account.getAddress();

  if (recoveredAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error("CSUC:EVM:signActionPayload - bad signature generated!");
  }

  return {
    curve: "secp256k1",
    hash: rawMessage,
    r: r.toString(),
    s: s.toString(),
    v: BigInt(v).toString(),
  } as CsucSignature;
};
