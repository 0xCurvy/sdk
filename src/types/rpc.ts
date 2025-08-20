import type { EstimateFee, GetTransactionReceiptResponse as StarknetTransactionReceipt } from "starknet";
import type { TransactionReceipt as EvmTransactionReceipt } from "viem";
import type { HexString } from "@/types/helper";

type StarknetFeeEstimate = {
  deployFee: EstimateFee | undefined;
  transactionFee: EstimateFee;
};

type CurvyFeeEstimate = {
  raw: bigint;
  fiat: number;
  tokenMeta: {
    symbol: string;
    decimals: number;
  };
  estimation: StarknetFeeEstimate | bigint;
};

type RecipientData = {
  address: HexString;
  addressId?: string;
  pubKey?: string;
};

type SendReturnType = {
  txHash: string;
  txExplorerUrl: string;
  receipt: EvmTransactionReceipt | StarknetTransactionReceipt;
};

export type { StarknetFeeEstimate, CurvyFeeEstimate, RecipientData, SendReturnType };
