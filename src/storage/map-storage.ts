import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import merge from "lodash.merge";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import { StorageError } from "@/errors";
import type { StorageInterface } from "@/interfaces/storage";
import type { CurvyWalletData } from "@/types";
import type { BalanceEntry, CurrencyMetadata, TotalBalance } from "@/types/storage";
import type { CurvyWallet } from "@/wallet";

dayjs.extend(duration);

export class MapStorage implements StorageInterface {
  readonly #walletStorage = new Map<string, CurvyWalletData>();
  readonly #currencyMetadata = new Map<string, CurrencyMetadata>();
  readonly #balances = new Map<string, BalanceEntry>();
  readonly #totalBalances = new Map<string, TotalBalance>();
  #priceStorage = new Map<string, { price: string; decimals: number }>();

  async upsertCurrencyMetadata(metadata: Map<string, CurrencyMetadata>) {
    this.#currencyMetadata.clear();

    for (const [key, value] of metadata.entries()) {
      this.#currencyMetadata.set(key, value);
    }
  }

  async getCurrencyMetadata(addressOrId: string | bigint, networkSlug: string) {
    let currencyMetadata: CurrencyMetadata | undefined;

    if (typeof addressOrId === "bigint") {
      currencyMetadata = Array.from(this.#currencyMetadata.values()).find(
        (c) => c.vaultTokenId === addressOrId.toString() && c.networkSlug === networkSlug,
      );
    } else {
      currencyMetadata = this.#currencyMetadata.get(
        this.#getCurrencyMetadataKey({ address: addressOrId, networkSlug }),
      );
    }

    if (!currencyMetadata) {
      throw new StorageError(
        `Currency metadata for address / vaultTokenId ${addressOrId} on network ${networkSlug} not found`,
      );
    }

    return currencyMetadata;
  }

  // Key generation helpers
  #getBalanceKey(e: { walletId: string; id: string; currencyAddress: string; networkSlug: string }): string {
    return `${e.walletId}-${e.id}-${e.currencyAddress}-${e.networkSlug}`;
  }
  #getTotalBalanceKey(e: { walletId: string; currencyAddress: string; networkSlug: string }): string {
    return `${e.walletId}-${e.currencyAddress}-${e.networkSlug}`;
  }
  #getCurrencyMetadataKey(e: { address: string; networkSlug: string }): string {
    return `${e.address}-${e.networkSlug}`;
  }

  async insertCurvyWallet(wallet: CurvyWallet) {
    if (this.#walletStorage.has(wallet.id)) {
      throw new StorageError(`Wallet with ID ${wallet.id} already exists in storage`);
    }

    this.#walletStorage.set(wallet.id, {
      ...wallet.serialize(),
      scanCursors: {
        latest: undefined,
        oldest: undefined,
      },
    });
  }

  async updateCurvyWalletData(walletId: string, changes: Partial<CurvyWalletData>) {
    const existingWallet = this.#walletStorage.get(walletId);

    if (!existingWallet) {
      throw new StorageError(`Wallet with ID ${walletId} not found in storage`);
    }

    const updatedWallet = merge(existingWallet, changes);

    this.#walletStorage.set(walletId, updatedWallet);
  }

  async getCurvyWalletDataById(id: string) {
    const wallet = this.#walletStorage.get(id);

    if (!wallet) {
      throw new StorageError(`Wallet with ID ${id} not found`);
    }

    return wallet;
  }

  async upsertPriceData(data: Map<string, { price: string; decimals: number }>) {
    this.#priceStorage.clear();

    for (const [key, value] of data.entries()) {
      this.#priceStorage.set(key, value);
    }
  }

  async getCurrencyPrice(token: string) {
    const price = this.#priceStorage.get(token);
    if (!price) {
      throw new StorageError(`Price for token ${token} not found`);
    }
    return price;
  }

  async getPriceFeed() {
    return this.#priceStorage;
  }

  async clearStorage() {
    this.#walletStorage.clear();
    this.#priceStorage.clear();
    this.#currencyMetadata.clear();
    this.#balances.clear();
    this.#totalBalances.clear();
  }

  async deleteBalanceEntries(balanceEntries: Array<BalanceEntry>) {
    for (const entry of balanceEntries) {
      this.#balances.delete(this.#getBalanceKey(entry));
    }
  }

  async removeSpentBalanceEntries(balanceEntries: BalanceEntry[]): Promise<void> {
    if (balanceEntries.length === 0) return;

    const uniqueWalletId = new Set(balanceEntries.map((b) => b.walletId));
    if (uniqueWalletId.size > 1) {
      throw new Error("Tried to remove spent balance entries for multiple wallets at once");
    }

    await this.updateBalanceEntries(
      balanceEntries[0].walletId,
      balanceEntries[0].networkSlug,
      balanceEntries.map((b) => ({ ...b, balance: 0n })),
    );
  }

  // Inside the MapStorage class

  private async updateTotalBalance(
    walletId: string,
    currencyAddress: string,
    networkSlug: string,
    environment: NETWORK_ENVIRONMENT_VALUES,
    symbol: string,
    delta: bigint,
  ): Promise<void> {
    if (delta === 0n) return;

    const key = this.#getTotalBalanceKey({ walletId, currencyAddress, networkSlug });

    const currentTotal = this.#totalBalances.get(key);
    const oldTotalValue = BigInt(currentTotal?.totalBalance || "0");

    const newTotalValue = oldTotalValue + delta;

    if (newTotalValue > 0n) {
      this.#totalBalances.set(key, {
        walletId,
        currencyAddress,
        networkSlug,
        environment,
        symbol,
        totalBalance: newTotalValue.toString(),
        lastUpdated: Date.now(),
      });
    } else {
      this.#totalBalances.delete(key);
    }
  }

  async updateBalanceEntries(walletId: string, networkSlug: string, entries: BalanceEntry[]): Promise<void> {
    if (entries.length === 0) return;

    if (!entries.every((e) => e.networkSlug === networkSlug || e.walletId === walletId)) {
      throw new Error("All entries must match the provided walletId and networkSlug");
    }

    const oldNoteEntries: BalanceEntry[] = [];
    for (const entry of this.#balances.values()) {
      if (entry.walletId === walletId && entry.networkSlug === networkSlug) {
        oldNoteEntries.push(entry);
      }
    }

    const newNoteIdSet = new Set(entries.map((e) => e.id));
    const entriesToDelete = oldNoteEntries.filter((oldEntry) => !newNoteIdSet.has(oldEntry.id));

    for (const entry of entriesToDelete) {
      this.#balances.delete(this.#getBalanceKey(entry));
    }

    const tokenKeys = new Set<string>();
    for (const entry of oldNoteEntries) {
      tokenKeys.add(`${entry.currencyAddress}::${entry.networkSlug}`);
    }
    for (const entry of entries) {
      tokenKeys.add(`${entry.currencyAddress}::${entry.networkSlug}`);
    }

    for (const key of tokenKeys) {
      const [currencyAddress, networkSlug] = key.split("::");

      const newSum = entries
        .filter((e) => e.currencyAddress === currencyAddress && e.networkSlug === networkSlug)
        .reduce((sum, e) => sum + BigInt(e.balance), 0n);

      const oldSum = oldNoteEntries
        .filter((e) => e.currencyAddress === currencyAddress && e.networkSlug === networkSlug)
        .reduce((sum, e) => sum + BigInt(e.balance), 0n);

      const delta = newSum - oldSum;
      const { environment, symbol } = entries[0] || oldNoteEntries[0];

      await this.updateTotalBalance(walletId, currencyAddress, networkSlug, environment, symbol, delta);
    }

    for (const entry of entries) {
      this.#balances.set(this.#getBalanceKey(entry), entry);
    }
  }

  async getBalances(walletId: string, environment?: NETWORK_ENVIRONMENT_VALUES): Promise<BalanceEntry[]> {
    return Array.from(this.#balances.values()).filter(
      (balance) => balance.walletId === walletId && (!environment || balance.environment === environment),
    );
  }

  async getTotals(walletId: string, environment?: NETWORK_ENVIRONMENT_VALUES): Promise<TotalBalance[]> {
    return Array.from(this.#totalBalances.values()).filter(
      (totalBalance) =>
        totalBalance.walletId === walletId && (!environment || totalBalance.environment === environment),
    );
  }

  async getBalancesByCurrencyAndNetwork(
    walletId: string,
    currencyAddress: string,
    networkSlug: string,
  ): Promise<BalanceEntry[]> {
    return Array.from(this.#balances.values()).filter(
      (balance) =>
        balance.walletId === walletId &&
        balance.currencyAddress === currencyAddress &&
        balance.networkSlug === networkSlug,
    );
  }
}
