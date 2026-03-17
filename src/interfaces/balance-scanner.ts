import type { MultiRpc } from "@/rpc/multi";
import type { BalanceEntry } from "@/types";

interface IBalanceScanner {
  refreshWalletBalances(
    walletId?: string,
    options?: {
      onProgress?: (entries: BalanceEntry[]) => void;
    },
  ): Promise<void>;

  pauseBalanceRefreshForWallet(walletId?: string): void;
  resumeBalanceRefreshForWallet(walletId?: string): void;

  get rpcClient(): MultiRpc;
  set rpcClient(value: MultiRpc);
}

export type { IBalanceScanner };
