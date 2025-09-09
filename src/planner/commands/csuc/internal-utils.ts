import { type EncodeAbiParametersReturnType, encodeAbiParameters, keccak256 } from "viem";
import type { Network } from "@/types/api";
import { type CsucAction, type CsucActionPayload, CsucActionSet, CsucActionType } from "@/types/csuc";
import type { HexString } from "@/types/helper";
import { CurvyAddressLike } from "@/planner/plan";
import { CsucSignature } from "dist/types";
import { CurvyCommandCSUCAddress } from "@/planner/addresses/csuc";

export const createActionFeeComputationRequest = (
  network: Network,
  action: CsucActionSet,
  from: CurvyCommandCSUCAddress,
  to: CurvyAddressLike,
  token: HexString,
  amount: bigint,
): CsucActionPayload => {
  let parameters: EncodeAbiParametersReturnType;

  if ([CsucActionSet.TRANSFER, CsucActionSet.WITHDRAW].includes(action)) {
    parameters = encodeAbiParameters([{ name: "recipient", type: "address" }], [to.address as `0x${string}`]);
  } else if (action === CsucActionSet.DEPOSIT_TO_AGGREGATOR) {
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
            ownerHash: BigInt(to.address),
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
    from: from.address,
    actionType: {
      service: "CSUC",
      type: action,
    },
    encodedData,
    createdAt: new Date(),
  };

  return payload;
};

export const fetchActionExecutionFee = async (payload: CsucActionPayload): Promise<bigint> => {
  return 123n; // TODO: Implement API call to fetch fee
};

export const createActionExecutionRequest = async (
  network: Network,
  from: CurvyCommandCSUCAddress,
  payload: CsucActionPayload,
  totalFee: bigint,
): Promise<CsucAction> => {
  // TODO: Think whether we need validation here at all because backend will fail.

  const chainId = network.chainId;

  const { token: currencyContractAddress } = JSON.parse(payload.encodedData) as any;
  const currency = network.currencies.find((currency) => {
    return currency.contractAddress === currencyContractAddress;
  });
  if (!currency) {
    throw new Error(`Token ${currencyContractAddress} not found on network ${network}`);
  }

  if (from.nonce === undefined) {
    throw new Error(`Nonce for ${currency.symbol} not found on ${from.address}`);
  }

  const signature = await from.sign(
    createActionSignatureRequest(chainId, payload, totalFee.toString(), from.nonce.toString()),
  );

  return {
    payload,
    totalFee: totalFee.toString(),
    signature: JSON.parse(signature) as CsucSignature,
  };
};

export const createActionSignatureRequest = (
  chainId: string,
  payload: CsucActionPayload,
  totalFee: string,
  nonce: string,
): string => {
  return hashActionPayload(chainId, payload, totalFee, nonce);
};

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
