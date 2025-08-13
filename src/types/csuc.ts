import type { Network } from "@/types/api";

export enum CsucSupportedNetwork {
  ETHEREUM_SEPOLIA = "ethereum-sepolia",
}

export enum CsucSupportedNetworkId {
  ETHEREUM_SEPOLIA = 1,
}

export enum CsucSupportedNetworkChainId {
  ETHEREUM_SEPOLIA = "11155111",
}

export enum CsucActionSet {
  TRANSFER = "transfer",
  WITHDRAW = "withdraw",
  DEPOSIT_TO_AGGREGATOR = "deposit-to-aggregator",
}

export type CsucActionType = {
  service: "CSUC";
  type: CsucActionSet;
};
export type CsucActionPayload = {
  id?: number;
  network: CsucSupportedNetwork;
  networkId: number;
  from: string;
  actionType: CsucActionType;
  encodedData: string;
  createdAt: Date;
};

export type CsucEstimatedActionCost = {
  payload: CsucActionPayload;
  offeredTotalFee: string;
  explanation: string;
};

export type CsucAction = {
  id?: string;
  payload: CsucActionPayload;
  totalFee: string;
  signature: CsucSignature;
  createdAt?: Date;
};

export type CsucSignature = {
  curve: "secp256k1";
  hash: string;
  r: string;
  s: string;
  v: string;
};

export enum CsucActionStage {
  INVALID = "INVALID",
  ACCEPTED = "ACCEPTED",
  BATCHED = "BATCHED",
  FINALIZED = "FINALIZED",
}

export type CsucActionStatus = {
  id: string;
  stage: CsucActionStage;
  estimatedInclusionTime: Date;
  batchId: string;
  explanation?: string;
};

export enum CsucBatchStage {
  WAITING = "WAITING",
  FULL = "FULL",
  SUBMITTED = "SUBMITTED",
  REVERTED = "REVERTED",
  FINALIZED = "FINALIZED",
}

export type CsucBatch = {
  id: string;
  network: Network;
  stage: CsucBatchStage;
  actionIds: string[];
  onChainHash: string;
  onChainCallParameters: unknown;
  onChainCost: string;
  createdAt: Date;
  updatedAt: Date;
};
export type CSAInfo = {
  network: CsucSupportedNetwork;
  address: string;
  balances: CsucBalance[];
  nonce: CsucNonce[];
};

export type CsucBalance = {
  token: string;
  amount: string;
};

export type CsucNonce = {
  token: string;
  value: string;
};

export function assertNetworkIsSupported(network: CsucSupportedNetwork): asserts network is CsucSupportedNetwork {
  if (network !== CsucSupportedNetwork.ETHEREUM_SEPOLIA) {
    throw new Error("CSUC:EVM - Unsupported network for action type conversion!");
  }
}
