import type { EstimateFee, GetTransactionReceiptResponse as StarknetTransactionReceipt } from "starknet";
import type { TransactionReceipt as EvmTransactionReceipt } from "viem";
import type { NETWORK_ENVIRONMENT_VALUES, NETWORKS, TOKENS } from "@/constants/networks";
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

type RpcBalance = { balance: bigint; currencyAddress: string; symbol: string; environment: NETWORK_ENVIRONMENT_VALUES };

type RpcBalances = Partial<
  Record<
    NETWORKS,
    Partial<
      Record<
        TOKENS,
        { balance: bigint; currencyAddress: string; symbol: string; environment: NETWORK_ENVIRONMENT_VALUES }
      >
    >
  >
>;

export type { StarknetFeeEstimate, CurvyFeeEstimate, RecipientData, SendReturnType, RpcBalance, RpcBalances };
