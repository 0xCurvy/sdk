import type { MultiRpc } from "@/rpc/multi";
import type { BalanceEntry, CurvyAddress } from "@/types";

interface IBalanceScanner {
  scanWalletBalances(
    walletId: string,
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

  scanNoteBalances(options?: { onProgress?: (entries: BalanceEntry[]) => void }): Promise<void>;

  get rpcClient(): MultiRpc;
  set rpcClient(value: MultiRpc);
}

export type { IBalanceScanner };
