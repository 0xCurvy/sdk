import type {
  Chain,
  TransactionReceipt as EvmTransactionReceipt,
  HttpTransport,
  PublicClient,
  WalletClient,
} from "viem";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { HexString } from "@/types/helper";

// ── Curvy-extended viem clients ──

// For future use
type CurvyClientActions = object;
type CurvyClientData = {
  readonly aggregatorContractAddress: string | undefined;
  readonly vaultContractAddress: string | undefined;
  readonly tokenBridgeContractAddress: string | undefined;
  readonly tokenMoverContractAddress: string | undefined;
  readonly portalFactoryContractAddress: string | undefined;
  readonly vaultContractVersion: string | undefined;
};
type CurvyClientConfiguration = CurvyClientActions & CurvyClientData;

type CurvyPublicClient = PublicClient<HttpTransport, Chain> & CurvyClientConfiguration;
type CurvyWalletClient = WalletClient<HttpTransport, Chain> & CurvyClientConfiguration;

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

export type { CurvyPublicClient, CurvyWalletClient, RpcCallReturnType, RpcBalance, RpcBalances, VaultBalance };
