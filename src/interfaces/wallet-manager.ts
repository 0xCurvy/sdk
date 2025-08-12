import type { CurvyWallet } from "@/wallet";

interface IWalletManager {
  get wallets(): Array<CurvyWallet>;

  get activeWallet(): CurvyWallet;

  hasActiveWallet(): boolean;

  getWalletById(id: string): CurvyWallet | undefined;

  hasWallet(id: string): boolean;

  setActiveWallet(wallet: CurvyWallet): Promise<void>;

  addWallet(wallet: CurvyWallet): Promise<void>;

  removeWallet(walletId: string): Promise<void>;

  scanWallet(wallet: CurvyWallet): Promise<void>;

  rescanWallets(walletIds?: Array<string>): Promise<void>;

  startIntervalScan(interval?: number): void;

  stopIntervalScan(): void;
}

export type { IWalletManager };
