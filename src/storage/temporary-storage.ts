import merge from "lodash.merge";
import type { TOKENS } from "@/constants/networks";
import { StorageError } from "@/errors";
import type { StorageInterface } from "@/interfaces/storage";
import type { CurvyAddress, MinifiedCurvyAddress } from "@/types/address";
import type { CurvyWalletData } from "@/types/wallet";
import { bytesToDecimalString, decimalStringToBytes } from "@/utils/decimal-conversions";
import type { CurvyWallet } from "@/wallet";

export class TemporaryStorage implements StorageInterface {
  readonly #walletStorage = new Map<string, CurvyWalletData>();
  readonly #addressStorage = new Map<string, Map<string, MinifiedCurvyAddress>>();
  #priceStorage = new Map<TOKENS, string>();

  async storeCurvyAddress(address: CurvyAddress) {
    try {
      const minifiedAddress = {
        ...address,
        ephemeralPublicKey: decimalStringToBytes(address.ephemeralPublicKey),
        publicKey: decimalStringToBytes(address.publicKey),
      };

      if (!this.#addressStorage.has(minifiedAddress.walletId)) {
        this.#addressStorage.set(minifiedAddress.walletId, new Map<string, MinifiedCurvyAddress>());
      }

      this.#addressStorage.get(minifiedAddress.walletId)?.set(minifiedAddress.id, minifiedAddress);
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

  async updateCurvyAddress(id: string, changes: Partial<CurvyAddress>) {
    const existingAddress = await this.getCurvyAddressById(id);
    if (!existingAddress) {
      throw new StorageError(`No addresses found for ID ${id}`);
    }

    const updatedAddress = merge(existingAddress, changes);

    const addressMap = this.#addressStorage.get(updatedAddress.walletId)!;
    addressMap.set(updatedAddress.id, {
      ...updatedAddress,
      ephemeralPublicKey: decimalStringToBytes(updatedAddress.ephemeralPublicKey),
      publicKey: decimalStringToBytes(updatedAddress.publicKey),
    });

    this.#addressStorage.set(updatedAddress.walletId, addressMap);
  }

  async updateManyCurvyAddresses(updates: Array<{ key: string; changes: Partial<CurvyAddress> }>) {
    try {
      for (const { key, changes } of updates) {
        await this.updateCurvyAddress(key, changes);
      }
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError("Failed to update address batch", error as Error);
    }
  }

  async getCurvyAddressById(id: string) {
    for (const addressMap of this.#addressStorage.values()) {
      const address = addressMap.get(id);
      if (address) {
        return {
          ...address,
          ephemeralPublicKey: bytesToDecimalString(address.ephemeralPublicKey),
          publicKey: bytesToDecimalString(address.publicKey),
        } as CurvyAddress;
      }
    }

    throw new StorageError(`Address with ID ${id} not found`);
  }

  async getCurvyAddressesByWalletId(walletId: string) {
    const addressMap = this.#addressStorage.get(walletId);
    if (!addressMap) {
      // throw new StorageError(`No addresses found for wallet ID ${walletId}`);
      return [];
    }

    return Array.from(addressMap.values()).map<CurvyAddress>((address) => ({
      ...address,
      ephemeralPublicKey: bytesToDecimalString(address.ephemeralPublicKey),
      publicKey: bytesToDecimalString(address.publicKey),
    }));
  }

  async getCurvyAddressesByWalletIdAndNetworkId(walletId: string, networkId: number) {
    const walletAddresses = await this.getCurvyAddressesByWalletId(walletId);

    return walletAddresses.filter((address) => address.network_id === networkId);
  }

  async getAllCurvyAddresses() {
    return Array.from(this.#addressStorage.values()).flatMap((addressMap) =>
      Array.from(addressMap.values()).map<CurvyAddress>((address) => ({
        ...address,
        ephemeralPublicKey: bytesToDecimalString(address.ephemeralPublicKey),
        publicKey: bytesToDecimalString(address.publicKey),
      })),
    );
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

  async updatePriceData(data: Map<TOKENS, string>) {
    this.#priceStorage = data;
  }

  async getTokenPrice(token: TOKENS) {
    const price = this.#priceStorage.get(token);
    if (!price) {
      throw new StorageError(`Price for token ${token} not found`);
    }
    return price;
  }

  async getAllTokenPrices() {
    return this.#priceStorage;
  }

  clearStorage(): Promise<void> {
    this.#walletStorage.clear();
    this.#addressStorage.clear();
    this.#priceStorage.clear();
    return Promise.resolve();
  }
}
