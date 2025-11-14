import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import merge from "lodash.merge";
import type { NETWORK_ENVIRONMENT_VALUES, TOKENS } from "@/constants/networks";
import { StorageError } from "@/errors";
import type { StorageInterface } from "@/interfaces/storage";
import {
  BALANCE_TYPE,
  type BALANCE_TYPE_VALUES,
  type BalanceSourcesOptions,
  type CurvyAddress,
  type CurvyWalletData,
  type MinifiedCurvyAddress,
  type SaBalanceEntry,
  type VaultBalanceEntry,
} from "@/types";
import type { BalanceEntry, CurrencyMetadata, NoteBalanceEntry, TotalBalance } from "@/types/storage";
import { bytesToDecimalString, decimalStringToBytes } from "@/utils/decimal-conversions";
import type { CurvyWallet } from "@/wallet";

dayjs.extend(duration);

const ADDRESS_STALENESS_THRESHOLD_MS = dayjs.duration(5, "minutes").asMilliseconds();

export class MapStorage implements StorageInterface {
  readonly #walletStorage = new Map<string, CurvyWalletData>();
  readonly #addresses = new Map<string, MinifiedCurvyAddress>();
  readonly #currencyMetadata = new Map<string, CurrencyMetadata>();
  readonly #balances = new Map<string, BalanceEntry>();
  readonly #totalBalances = new Map<string, TotalBalance>();
  #priceStorage = new Map<TOKENS, { price: string; decimals: number }>();

  async storeCurvyAddress(address: CurvyAddress) {
    try {
      const minifiedAddress = {
        ...address,
        ephemeralPublicKey: decimalStringToBytes(address.ephemeralPublicKey),
        publicKey: decimalStringToBytes(address.publicKey),
      };

      this.#addresses.set(minifiedAddress.id, minifiedAddress);
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError("Failed to write announcement", error as Error);
    }
  }

  async storeManyCurvyAddresses(addresses: CurvyAddress[]) {
    try {
      for (const address of addresses) {
        await this.storeCurvyAddress(address);
      }
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError("Failed to write address batch", error as Error);
    }
  }

  async getCurvyAddress(address: string): Promise<CurvyAddress> {
    const foundAddress = Array.from(this.#addresses.values()).find((addr) => addr.address === address);
    if (foundAddress) {
      return {
        ...foundAddress,
        ephemeralPublicKey: bytesToDecimalString(foundAddress.ephemeralPublicKey),
        publicKey: bytesToDecimalString(foundAddress.publicKey),
      } as CurvyAddress;
    }

    throw new StorageError(`Address ${address} not found`);
  }

  async getCurvyAddressById(id: string) {
    const address = this.#addresses.get(id);
    if (address) {
      return {
        ...address,
        ephemeralPublicKey: bytesToDecimalString(address.ephemeralPublicKey),
        publicKey: bytesToDecimalString(address.publicKey),
      } as CurvyAddress;
    }

    throw new StorageError(`Address with ID ${id} not found`);
  }

  async getCurvyAddressesByWalletId(walletId: string) {
    const allAddresses = Array.from(this.#addresses.values());

    return allAddresses
      .filter((address) => address.walletId === walletId)
      .map((address) => ({
        ...address,
        ephemeralPublicKey: bytesToDecimalString(address.ephemeralPublicKey),
        publicKey: bytesToDecimalString(address.publicKey),
      }));
  }

  async getScannableAddresses(
    walletId: string,
    environment: NETWORK_ENVIRONMENT_VALUES,
    stalenessThresholdMs = ADDRESS_STALENESS_THRESHOLD_MS,
  ) {
    const stalenessCutoff = +dayjs() - stalenessThresholdMs;

    const walletAddresses = await this.getCurvyAddressesByWalletId(walletId);

    return walletAddresses.filter((address) => {
      const isNew = !address.lastScannedAt;
      const isStale = address.lastScannedAt ? address.lastScannedAt[environment] < stalenessCutoff : false;

      return isNew || isStale;
    });
  }

  async getNetworkSlugsOfAddressBalances(address: string) {
    const networks = new Set<string>();
    for (const balance of this.#balances.values()) {
      if (balance.source === address) {
        networks.add(balance.networkSlug);
      }
    }
    return Array.from(networks);
  }

  async getAddressBalance(address: string, currencyAddress: string, networkSlug: string, type: BALANCE_TYPE_VALUES) {
    return this.#balances.get(this.#getBalanceKey({ source: address, type, currencyAddress, networkSlug }));
  }

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
  #getBalanceKey(e: { source: string; type: string; currencyAddress: string; networkSlug: string }): string {
    return `${e.source}-${e.type}-${e.currencyAddress}-${e.networkSlug}`;
  }
  #getTotalBalanceKey(e: { walletId: string; currencyAddress: string; networkSlug: string }): string {
    return `${e.walletId}-${e.currencyAddress}-${e.networkSlug}`;
  }
  #getCurrencyMetadataKey(e: { address: string; networkSlug: string }): string {
    return `${e.address}-${e.networkSlug}`;
  }

  async getNoteBalances(walletId: string, networkSlug?: string): Promise<NoteBalanceEntry[]> {
    return Array.from(this.#balances.values()).filter(
      (b) => b.walletId === walletId && b.type === BALANCE_TYPE.NOTE && (!networkSlug || b.networkSlug === networkSlug),
    ) as NoteBalanceEntry[];
  }

  async storeCurvyWallet(wallet: CurvyWallet) {
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

  async getLatestScanCursor(walletId: string) {
    const wallet = this.#walletStorage.get(walletId);

    if (!wallet) {
      throw new StorageError(`Wallet with ID ${walletId} not found`);
    }

    return wallet.scanCursors.latest;
  }

  async getOldestScanCursor(walletId: string) {
    const wallet = this.#walletStorage.get(walletId);

    if (!wallet) {
      throw new StorageError(`Wallet with ID ${walletId} not found`);
    }

    return wallet.scanCursors.oldest;
  }

  async getScanInfo(walletId: string) {
    const wallet = this.#walletStorage.get(walletId);

    if (!wallet) {
      throw new StorageError(`Wallet with ID ${walletId} not found`);
    }

    return {
      scanCursors: wallet.scanCursors,
      oldestCutoff: wallet.createdAt,
    };
  }

  async upsertPriceData(data: Map<TOKENS, { price: string; decimals: number }>) {
    this.#priceStorage.clear();

    for (const [key, value] of data.entries()) {
      this.#priceStorage.set(key, value);
    }
  }

  async getCurrencyPrice(token: TOKENS) {
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
    this.#addresses.clear();
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

    let notes: NoteBalanceEntry[] | undefined;
    let addresses: (SaBalanceEntry | VaultBalanceEntry)[] | undefined;

    for (const entry of balanceEntries) {
      switch (entry.type) {
        case BALANCE_TYPE.NOTE: {
          if (!notes) notes = [entry];
          else notes.push(entry);
          break;
        }
        case BALANCE_TYPE.SA:
        case BALANCE_TYPE.VAULT: {
          if (!addresses) addresses = [entry];
          else addresses.push(entry);
          break;
        }
      }
    }

    if (notes) {
      await this.updateNoteBalances(
        balanceEntries[0].walletId,
        balanceEntries[0].networkSlug,
        notes.map((b) => ({ ...b, balance: 0n })),
      );
    }

    if (addresses) {
      await this.updateAddressBalances(
        balanceEntries[0].walletId,
        addresses.map((b) => ({ ...b, balance: 0n })),
      );
    }
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

  async updateAddressBalances(walletId: string, entries: (SaBalanceEntry | VaultBalanceEntry)[]): Promise<void> {
    const sources = [...new Set(entries.map((e) => e.source))];

    const oldBalanceEntriesOfSources: BalanceEntry[] = [];
    for (const entry of this.#balances.values()) {
      if (sources.includes(entry.source)) {
        oldBalanceEntriesOfSources.push(entry);
      }
    }

    const tokenKeys = new Set<string>();
    for (const entry of oldBalanceEntriesOfSources) {
      tokenKeys.add(`${entry.currencyAddress}::${entry.networkSlug}`);
    }
    for (const entry of entries) {
      tokenKeys.add(`${entry.currencyAddress}::${entry.networkSlug}`);
    }

    for (const key of tokenKeys) {
      const [currencyAddress, networkSlug] = key.split("::");

      const currentOldEntries = oldBalanceEntriesOfSources.filter(
        (e) => e.currencyAddress === currencyAddress && e.networkSlug === networkSlug,
      );
      const currentNewEntries = entries.filter(
        (e) => e.currencyAddress === currencyAddress && e.networkSlug === networkSlug,
      );

      const newEntryKeys = new Set(currentNewEntries.map((e) => `${e.source}-${e.type}`));
      const entriesToDelete = currentOldEntries.filter(
        (oldEntry) => !newEntryKeys.has(`${oldEntry.source}-${oldEntry.type}`),
      );

      for (const entry of entriesToDelete) {
        this.#balances.delete(this.#getBalanceKey(entry));
      }

      const oldSum = currentOldEntries.reduce((sum, b) => sum + BigInt(b.balance), 0n);
      const newSum = currentNewEntries.reduce((sum, e) => sum + BigInt(e.balance), 0n);
      const delta = newSum - oldSum;
      const { environment, symbol } = currentNewEntries[0] || currentOldEntries[0];

      await this.updateTotalBalance(walletId, currencyAddress, networkSlug, environment, symbol, delta);

      for (const entry of currentNewEntries) {
        this.#balances.set(this.#getBalanceKey(entry), entry);
      }
    }
  }

  async updateNoteBalances(walletId: string, networkSlug: string, entries: NoteBalanceEntry[]): Promise<void> {
    if (entries.length === 0) return;

    if (!entries.every((e) => e.type === BALANCE_TYPE.NOTE)) {
      throw new Error("All entries must be of type NOTE");
    }

    if (!entries.every((e) => e.networkSlug === networkSlug || e.walletId === walletId)) {
      throw new Error("All entries must match the provided walletId and networkSlug");
    }

    const oldNoteEntries: NoteBalanceEntry[] = [];
    for (const entry of this.#balances.values()) {
      if (entry.walletId === walletId && entry.type === BALANCE_TYPE.NOTE && entry.networkSlug === networkSlug) {
        oldNoteEntries.push(entry);
      }
    }

    const newNoteSourcesSet = new Set(entries.map((e) => e.source));
    const entriesToDelete = oldNoteEntries.filter((oldEntry) => !newNoteSourcesSet.has(oldEntry.source));

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

  async getTotalsByCurrencyAndNetwork(walletId: string): Promise<TotalBalance[]> {
    return Array.from(this.#totalBalances.values()).filter((t) => t.walletId === walletId);
  }

  async getTotalsByNetwork(walletId: string, networkSlug: string): Promise<TotalBalance[]> {
    return Array.from(this.#totalBalances.values()).filter(
      (t) => t.walletId === walletId && t.networkSlug === networkSlug,
    );
  }

  async getBalanceSources(
    walletId: string,
    currencyAddress: string,
    networkSlug: string,
    options: BalanceSourcesOptions = {
      sortByTypeRanking: {
        [BALANCE_TYPE.NOTE]: 1,
        [BALANCE_TYPE.VAULT]: 2,
        [BALANCE_TYPE.SA]: 3,
      },
      sortByBalance: "desc",
    },
  ): Promise<BalanceEntry[]> {
    const balances = Array.from(this.#balances.values()).filter(
      (b) => b.walletId === walletId && b.currencyAddress === currencyAddress && b.networkSlug === networkSlug,
    );

    return balances.sort((a, b) => {
      const typeComparison = options.sortByTypeRanking[a.type] - options.sortByTypeRanking[b.type];
      if (typeComparison !== 0) return typeComparison;

      if (options.sortByBalance === "asc") {
        return Number(a.balance - b.balance);
      } else {
        return Number(b.balance - a.balance);
      }
    });
  }

  async getBalancesGroupedBySource(
    walletId: string,
    type?: BALANCE_TYPE_VALUES,
    networkSlug?: string,
    environment?: NETWORK_ENVIRONMENT_VALUES,
  ): Promise<Record<string, BalanceEntry[]>> {
    const grouped: Record<string, BalanceEntry[]> = {};
    const balances = this.#balances.values().filter((balanceEntry) => {
      if (balanceEntry.walletId !== walletId) return false;
      if (environment && balanceEntry.environment !== environment) return false;
      if (networkSlug && balanceEntry.networkSlug !== networkSlug) return false;
      if (type && balanceEntry.type !== type) return false;

      return true;
    });

    for (const balance of balances) {
      if (!grouped[balance.source]) grouped[balance.source] = [];
      grouped[balance.source].push(balance);
    }
    return grouped;
  }

  async getBalanceEntry(address: string, currencyAddress: string, networkSlug: string, type: BALANCE_TYPE_VALUES) {
    const balance = this.#balances.get(this.#getBalanceKey({ source: address, type, currencyAddress, networkSlug }));
    if (!balance) {
      throw new StorageError(
        `Balance entry for address ${address} with currency ${currencyAddress} on network ${networkSlug} and type ${type} not found`,
      );
    }
    return balance;
  }
}
