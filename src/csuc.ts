import { type EncodeAbiParametersReturnType, encodeAbiParameters } from "viem";
import type { CurvyAddress } from "@/types/address";
import type { Network } from "@/types/api";
import { type CsucAction, type CsucActionPayload, CsucActionSet } from "@/types/csuc";
import type { HexString } from "@/types/helper";
import { signActionPayload } from "@/utils/csuc";
import { toSlug } from "../../backend/src/lib/repositories/network/type";

const prepareCsucActionEstimationRequest = async (
  network: Network,
  action: CsucActionSet,
  from: CurvyAddress,
  to: HexString,
  token: HexString,
  amount: string | bigint,
) => {
  let parameters: EncodeAbiParametersReturnType;

  // TODO: spaghetti code refactor
  if (!["localnet", "ethereum-sepolia"].includes(toSlug(network.name))) {
    throw new Error(`CSUC is not supported on ${network.name} network`);
  }

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
            ownerHash: BigInt(to),
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

const prepareCuscActionRequest = async (
  network: Network,
  from: CurvyAddress,
  privateKey: HexString,
  payload: CsucActionPayload,
  totalFee: string,
): Promise<CsucAction> => {
  // TODO: Think whether we need validation here at all because backend will fail.

  const chainId = network.chainId;
  const networkName = toSlug(network.name);

  const { token: currencyContractAddress } = JSON.parse(payload.encodedData) as any;
  const currency = network.currencies.find((currency) => {
    return currency.contractAddress === currencyContractAddress;
  });
  if (!currency) {
    throw new Error(`Token ${currencyContractAddress} not found on network ${network}`);
  }

  const nonce = from.csuc.nonces[networkName]?.[currency.symbol];

  if (nonce === undefined) {
    throw new Error(`Nonce for ${currency.symbol} not found on ${from.address}`);
  }

  const signature = await signActionPayload(chainId, payload, totalFee, nonce.toString(), privateKey);

  return {
    payload,
    totalFee,
    signature,
  };
};

export { prepareCsucActionEstimationRequest, prepareCuscActionRequest };
