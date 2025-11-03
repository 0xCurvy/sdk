import type { EstimateFee, GetTransactionReceiptResponse as StarknetTransactionReceipt } from "starknet";
import type { TransactionReceipt as EvmTransactionReceipt } from "viem";
import type { NETWORK_ENVIRONMENT_VALUES, NETWORKS, TOKENS } from "@/constants/networks";
import type { RawAnnouncement } from "@/types/api";
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
  rawAnnouncement: RawAnnouncement;
};

type RpcCallReturnType = {
  txHash: string;
  txExplorerUrl: string;
  receipt: EvmTransactionReceipt | StarknetTransactionReceipt;
};

type RpcBalance = {
  balance: bigint;
  currencyAddress: string;
  symbol: string;
  decimals: number;
  environment: NETWORK_ENVIRONMENT_VALUES;
};

type RpcBalances = Partial<
  Record<
    NETWORKS,
    Partial<
      Record<
        TOKENS,
        {
          balance: bigint;
          currencyAddress: string;
          symbol: string;
          decimals: number;
          environment: NETWORK_ENVIRONMENT_VALUES;
        }
      >
    >
  >
>;

type VaultBalance = {
  network: string;
  address: `0x${string}`;
  balances: { balance: bigint; currencyAddress: string; vaultTokenId: bigint }[];
};

export type {
  StarknetFeeEstimate,
  CurvyFeeEstimate,
  RecipientData,
  RpcCallReturnType,
  RpcBalance,
  RpcBalances,
  VaultBalance,
};
