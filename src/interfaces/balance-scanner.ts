import type { MultiRpc } from "@/rpc/multi";
import type { BalanceEntry } from "@/types";

interface IBalanceScanner {
  scanWalletBalances(
    walletId: string,
    options?: {
      onProgress?: (entries: BalanceEntry[]) => void;
      batchSize?: number;
    },
  ): Promise<void>;

  get rpcClient(): MultiRpc;
  set rpcClient(value: MultiRpc);
}

export { IBalanceScanner };
