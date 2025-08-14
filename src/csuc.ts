import { type EncodeAbiParametersReturnType, encodeAbiParameters } from "viem";
import type { CurvyAddress } from "@/types/address";
import {
  assertNetworkIsSupported,
  type CsucAction,
  type CsucActionPayload,
  CsucActionSet,
  type CsucSupportedNetwork,
} from "@/types/csuc";
import type { HexString } from "@/types/helper";
import { getTokenSymbol, signActionPayload, supportedNetworkToChainId } from "@/utils/csuc";

const prepareCsucActionEstimationRequest = async (
  network: CsucSupportedNetwork,
  action: CsucActionSet,
  from: CurvyAddress,
  to: HexString,
  token: HexString,
  amount: string | bigint,
) => {
  let parameters: EncodeAbiParametersReturnType;

  if ([CsucActionSet.TRANSFER, CsucActionSet.WITHDRAW].includes(action)) {
    parameters = encodeAbiParameters([{ name: "recipient", type: "address" }], [to]);
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
            ownerHash: to as any,
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

  const encodedData = JSON.stringify({
    token,
    amount,
    parameters,
  });
  const payload: CsucActionPayload = {
    network,
    networkId: 1,
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

const prepareCuscActionRequest = async (
  network: CsucSupportedNetwork,
  from: CurvyAddress,
  privateKey: HexString,
  payload: CsucActionPayload,
  totalFee: string,
): Promise<CsucAction> => {
  assertNetworkIsSupported(network);

  const chainId = supportedNetworkToChainId(network);

  const { token } = JSON.parse(payload.encodedData) as any;
  const tokenSymbol = getTokenSymbol(network, token);
  if (!tokenSymbol) {
    throw new Error(`Token ${token} not found on network ${network}`);
  }
  const nonce = from.csuc.nonces[network]![tokenSymbol];

  const signature = await signActionPayload(chainId, payload, totalFee, nonce!.toString(), privateKey);

  return {
    payload,
    totalFee,
    signature,
  };
};

export { prepareCsucActionEstimationRequest, prepareCuscActionRequest };
