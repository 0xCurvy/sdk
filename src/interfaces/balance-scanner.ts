import type { MultiRpc } from "@/rpc/multi";
import type { BalanceEntry, CurvyAddress } from "@/types";
import type { NETWORK_ENVIRONMENT_VALUES } from "../constants/networks";

interface IBalanceScanner {
  scanWalletBalances(
    walletId: string,
    environment: NETWORK_ENVIRONMENT_VALUES,
    options?: {
      onProgress?: (entries: BalanceEntry[]) => void;
    },
  ): Promise<void>;

  scanAddressBalances(
    address: CurvyAddress,
    options?: {
      onProgress?: (entries: BalanceEntry[]) => void;
    },
  ): Promise<void>;

  scanNoteBalances(
    walletId: string,
    environment: NETWORK_ENVIRONMENT_VALUES,
    options?: { onProgress?: (entries: BalanceEntry[]) => void },
  ): Promise<void>;

  get rpcClient(): MultiRpc;
  set rpcClient(value: MultiRpc);
}

export type { IBalanceScanner };
