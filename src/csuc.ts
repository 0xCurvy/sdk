import { ethers, keccak256 } from "ethers";
import { type EncodeAbiParametersReturnType, encodeAbiParameters } from "viem";
import type { Network } from "@/types/api";
import {
  type CsucAction,
  type CsucActionPayload,
  CsucActionSet,
  type CsucActionType,
  type CsucSignature,
} from "@/types/csuc";
import type { HexString } from "@/types/helper";

const prepareCsucActionEstimationRequest = async (
  network: Network,
  action: CsucActionSet,
  from: HexString,
  to: HexString | bigint, // TODO: Split this into two functions
  token: HexString,
  amount: string | bigint,
) => {
  let parameters: EncodeAbiParametersReturnType = "0x";

  if ([CsucActionSet.TRANSFER, CsucActionSet.WITHDRAW].includes(action)) {
    if (typeof to !== "bigint") {
      parameters = encodeAbiParameters([{ name: "recipient", type: "address" }], [to]);
    }
  } else if (action === CsucActionSet.DEPOSIT_TO_AGGREGATOR && typeof to === "bigint") {
    parameters = encodeAbiParameters(
      [
        {
          name: "_notes",
          type: "tuple[]",
          internalType: "struct CurvyAggregator_Types.Note[]",
          components: [
            {
              name: "ownerHash",
              type: "uint256",
              internalType: "uint256",
            },
            {
              name: "token",
              type: "uint256",
              internalType: "uint256",
            },
            {
              name: "amount",
              type: "uint256",
              internalType: "uint256",
            },
          ],
        },
      ],
      [
        [
          {
            ownerHash: to,
            token: BigInt(token),
            amount: BigInt(amount),
          },
        ],
      ],
    );
  } else {
    throw new Error(
      `Unsupported action type: ${action}. Supported actions are: ${Object.values(CsucActionSet).join(", ")}`,
    );
  }

  if (parameters.replace("0x", "").length % 64 !== 0) {
    throw new Error(`Invalid parameters length: ${parameters.length}. Expected a multiple of 64.`);
  }

  const encodedData = JSON.stringify({
    token,
    amount,
    parameters,
  });

  const payload: CsucActionPayload = {
    networkId: network.id,
    from: from,
    actionType: {
      service: "CSUC",
      type: action,
    },
    encodedData,
    createdAt: new Date(),
  };

  return payload;
};

const prepareCuscActionRequest = async (
  network: Network,
  nonce: bigint,
  privateKey: HexString,
  payload: CsucActionPayload,
  totalFee: string,
): Promise<CsucAction> => {
  // TODO: Think whether we need validation here at all because backend will fail.

  const chainId = network.chainId;

  const signature = await signActionPayload(chainId, payload, totalFee, nonce.toString(), privateKey);

  return {
    payload,
    totalFee,
    signature,
  };
};

const hashActionPayload = (chainId: string, payload: CsucActionPayload, totalFee: string, nonce: string): string => {
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
const getOnchainActionId = (payload: CsucActionPayload): bigint => {
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

const signActionPayload = async (
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

export { prepareCsucActionEstimationRequest, prepareCuscActionRequest, getOnchainActionId, hashActionPayload };
