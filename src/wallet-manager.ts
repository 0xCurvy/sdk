import { AddressScanner } from "@/address-scanner";
import type { CurvyEventEmitter } from "@/events";
import type { IAddressScanner } from "@/interfaces/address-scanner";
import type { IApiClient } from "@/interfaces/api";
import type { ICore } from "@/interfaces/core";
import type { StorageInterface } from "@/interfaces/storage";
import type { IWalletManager } from "@/interfaces/wallet-manager";
import { signMessage } from "@/utils/encryption";
import type { CurvyWallet } from "@/wallet";

const JWT_REFRESH_INTERVAL = 14 * (60 * 10 ** 3);
const SCAN_REFRESH_INTERVAL = 60 * 10 ** 3;

class WalletManager implements IWalletManager {
  readonly #wallets: Map<string, CurvyWallet>;
  readonly #apiClient: IApiClient;
  readonly #addressScanner: IAddressScanner;
  readonly #storage: StorageInterface;

  #scanInterval: NodeJS.Timeout | null;
  #activeWallet: CurvyWallet | null;

  constructor(client: IApiClient, emitter: CurvyEventEmitter, storage: StorageInterface, core: ICore) {
    this.#apiClient = client;
    this.#wallets = new Map<string, CurvyWallet>();
    this.#storage = storage;
    this.#addressScanner = new AddressScanner(storage, core, client, emitter);

    this.#scanInterval = null;
    this.#activeWallet = null;
  }

  get wallets() {
    return Array.from(this.#wallets.values());
  }

  get activeWallet() {
    if (!this.#activeWallet) {
      throw new Error("No active wallet set.");
    }
    return this.#activeWallet;
  }

  hasActiveWallet(): boolean {
    return this.#activeWallet !== null;
  }

  getWalletById(id: string): CurvyWallet | undefined {
    return this.#wallets.get(id);
  }

  hasWallet(id: string): boolean {
    return this.#wallets.has(id);
  }

  async setActiveWallet(wallet: CurvyWallet) {
    if (!this.#wallets.has(wallet.id)) {
      throw new Error(`Wallet with id ${wallet.id} does not exist.`);
    }

    this.#activeWallet = wallet;

    this.#apiClient.updateBearerToken(
      await this.#apiClient.auth.GetBearerTotp().then((nonce) => {
        return this.#apiClient.auth.CreateBearerToken({ nonce, signature: signMessage(nonce, wallet.keyPairs.s) });
      }),
    );

    setInterval(
      () =>
        this.#apiClient.auth.RefreshBearerToken().then((token) => {
          this.#apiClient.updateBearerToken(token);
        }),
      JWT_REFRESH_INTERVAL,
    );
  }

  async addWallet(wallet: CurvyWallet) {
    this.#wallets.set(wallet.id, wallet);

    await this.setActiveWallet(wallet);

    await this.#storage.storeCurvyWallet(wallet);

    if (!this.#scanInterval) {
      this.startIntervalScan();
      return;
    }

    await this.scanWallet(wallet);
  }

  async removeWallet(walletId: string) {
    if (!this.#wallets.has(walletId)) {
      throw new Error(`Wallet with id ${walletId} does not exist.`);
    }

    this.#apiClient.updateBearerToken(undefined);
    this.#wallets.delete(walletId);

    if (this.#wallets.size > 0) {
      const wallet = this.#wallets.values().next().value;
      if (wallet) await this.setActiveWallet(wallet);
      return;
    }

    this.#activeWallet = null;
    this.stopIntervalScan();
    return;
  }

  async scanWallet(wallet: CurvyWallet) {
    await this.#addressScanner.scan([wallet]);
  }

  async rescanWallets(walletIds?: Array<string>) {
    if (this.#scanInterval) {
      this.stopIntervalScan();
    }

    const wallets = walletIds ? this.wallets.filter((wallet) => walletIds.includes(wallet.id)) : this.wallets;

    await this.#addressScanner.scan(wallets);
    this.startIntervalScan();
  }

  /*
    TODO
        Should we allow scanning of all wallets at once, or should we only scan the active wallet?
        If we allow scanning of all wallets, we should consider how we approach request auth verification,
        as currently the bearer token is set to the active wallet's token.
  */

  /*
   * Starts an interval scan for all wallets.
   * @param interval - The interval in milliseconds to scan wallets. Default is 60 seconds.
   */
  startIntervalScan(interval = SCAN_REFRESH_INTERVAL): void {
    this.#addressScanner.scan(this.wallets).then(() => {
      this.#scanInterval = setInterval(() => this.#addressScanner.scan(this.wallets), interval);
    });
  }

  stopIntervalScan(): void {
    if (!this.#scanInterval) {
      return;
    }

    clearInterval(this.#scanInterval);
    this.#scanInterval = null;
  }
}

export { WalletManager };
