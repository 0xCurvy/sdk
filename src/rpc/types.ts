import type { TransactionReceipt as EvmTransactionReceipt } from "viem";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { HexString } from "@/types/helper";

// ── RPC call / balance shapes (rpc-internal data model) ──

type RpcCallReturnType = {
  txHash: string;
  txExplorerUrl: string;
  receipt: EvmTransactionReceipt;
};

type RpcBalance = {
  id: number;
  balance: bigint;
  currencyAddress: HexString;
  vaultTokenId: bigint | null;
  symbol: string;
  decimals: number;
  environment: NETWORK_ENVIRONMENT_VALUES;
};

type RpcBalances = Partial<Record<string, Partial<Record<HexString, RpcBalance>>>>;

type VaultBalance = {
  network: string;
  address: `0x${string}`;
  balances: { balance: bigint; currencyAddress: string; vaultTokenId: bigint }[];
};

export type { RpcCallReturnType, RpcBalance, RpcBalances, VaultBalance };
