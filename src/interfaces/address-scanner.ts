import type { CurvyWallet } from "@/wallet";

interface IAddressScanner {
  isSyncing: boolean;

  scan(wallets: CurvyWallet[]): Promise<void>;
}

export type { IAddressScanner };
