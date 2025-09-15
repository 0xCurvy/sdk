import dayjs from "dayjs";
import type { IApiClient } from "@/interfaces/api";
import type { IBalanceScanner } from "@/interfaces/balance-scanner";
import type { ICore } from "@/interfaces/core";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import type { StorageInterface } from "@/interfaces/storage";
import type { IWalletManager } from "@/interfaces/wallet-manager";
import type { MultiRpc } from "@/rpc/multi";
import {
  BALANCE_TYPE,
  type CsucBalanceEntry,
  type CurvyAddress,
  type NoteBalanceEntry,
  type SaBalanceEntry,
} from "@/types";
import type { FullNoteData } from "@/types/note";
import type { BalanceEntry } from "@/types/storage";
import { toSlug } from "@/utils/helpers";
import type { NETWORK_ENVIRONMENT_VALUES } from "./constants/networks";

export class BalanceScanner implements IBalanceScanner {
  readonly #NOTE_BATCH_SIZE = 10;
  readonly #ADDRESS_BATCH_SIZE = 10;
  readonly #semaphore: Partial<Record<string, boolean>>;
  #scanProgress = {
    addresses: 0,
    notes: 0,
  };

  #rpcClient: MultiRpc;
  readonly apiClient: IApiClient;
  readonly #storage: StorageInterface;
  readonly #emitter: ICurvyEventEmitter;
  readonly #core: ICore;
  readonly #walletManager: IWalletManager;

  constructor(
    rpcClient: MultiRpc,
    apiClient: IApiClient,
    storage: StorageInterface,
    emitter: ICurvyEventEmitter,
    core: ICore,
    walletManager: IWalletManager,
  ) {
    this.#rpcClient = rpcClient;
    this.apiClient = apiClient;
    this.#storage = storage;
    this.#emitter = emitter;
    this.#core = core;
    this.#walletManager = walletManager;
    this.#semaphore = Object.create(null);
  }

  set rpcClient(rpcClient: MultiRpc) {
    this.#rpcClient = rpcClient;
  }

  get rpcClient() {
    if (!this.#rpcClient) {
      throw new Error("RPC client not set.");
    }
    return this.#rpcClient;
  }

  get totalScanProgress() {
    return ((this.#scanProgress.notes + this.#scanProgress.addresses) / 2) * 100;
  }

  #resetScanProgress() {
    this.#scanProgress = {
      addresses: 0,
      notes: 0,
    };
  }

  async #processSaBalances(addresses: CurvyAddress[]): Promise<BalanceEntry[]> {
    const arrLength = addresses.length;
    const entries: SaBalanceEntry[] = [];

    for (let i = 0; i < arrLength; i++) {
      const address = addresses[i];
      const networks = await this.#storage.getNetworkSlugsOfAddressBalances(address.address);

      const saData = await this.rpcClient.getBalances(address, networks);

      for (const networkSlug in saData) {
        for (const currencyAddress in saData[networkSlug]) {
          const balanceData = saData[networkSlug][currencyAddress];

          if (!balanceData) continue;

          entries.push({
            walletId: address.walletId,
            source: address.address,
            type: BALANCE_TYPE.SA,

            networkSlug,
            environment: balanceData.environment,

            currencyAddress,
            balance: balanceData.balance,
            symbol: balanceData.symbol,
            decimals: balanceData.decimals,

            createdAt: address.createdAt,

            lastUpdated: +dayjs(),
          });
        }
      }
    }
    return entries;
  }
  async #processCsucBalances(addresses: CurvyAddress[]): Promise<BalanceEntry[]> {
    const arrLength = addresses.length;

    //TODO Support multiple networks
    const {
      data: { csaInfo },
    } = await this.apiClient.csuc.GetCSAInfo({ network: "localnet", csas: addresses.map((a) => a.address) });

    const entries: CsucBalanceEntry[] = [];

    for (let i = 0; i < arrLength; i++) {
      const { balances, address, nonce: nonces, network } = csaInfo[i];
      const balancesLength = balances.length;

      for (let j = 0; j < balancesLength; j++) {
        const { token: currencyAddress, amount } = balances[j];

        const { symbol, environment, decimals } = await this.#storage.getCurrencyMetadata(
          currencyAddress,
          toSlug(network),
        );

        const balance = BigInt(amount);
        if (balance === 0n) continue; // Skip zero balances

        const nonce = BigInt(nonces[j].value);

        entries.push({
          walletId: addresses[i].walletId,
          source: address,
          type: BALANCE_TYPE.CSUC,

          networkSlug: toSlug(network),
          environment,
          decimals,

          currencyAddress,
          balance,
          symbol,

          nonce,

          lastUpdated: +dayjs(),
        });
      }
    }
    return entries;
  }
  async #processNotes(notes: FullNoteData[]): Promise<BalanceEntry[]> {
    const entries: NoteBalanceEntry[] = [];

    for (let i = 0; i < notes.length; i++) {
      const {
        balance: { token, amount },
        ownerHash,
        owner,
        deliveryTag,
      } = notes[i];

      if (amount === "0") continue; // Skip zero balance notes

      const networkSlug = "localnet"; // TODO Support multiple networks

      const { symbol, environment, address, decimals } = await this.#storage.getCurrencyMetadata(token, networkSlug);

      entries.push({
        walletId: this.#walletManager.activeWallet.id,
        source: ownerHash,
        type: BALANCE_TYPE.NOTE,

        networkSlug,
        environment,

        currencyAddress: address,
        symbol,
        balance: BigInt(amount),
        decimals,

        owner: {
          babyJubjubPublicKey: {
            x: owner.babyJubjubPublicKey.x,
            y: owner.babyJubjubPublicKey.y,
          },
          sharedSecret: owner.sharedSecret,
        },
        deliveryTag: {
          ephemeralKey: deliveryTag.ephemeralKey,
          viewTag: deliveryTag.viewTag,
        },

        lastUpdated: +dayjs(),
      });
    }
    // }

    return entries;
  }

  /**
   * A helper function to process a batch of addresses.
   * For each address, it fetches both SA and CSUC balances concurrently.
   * @param addressBatch An array of CurvyAddress objects to process.
   * @returns A Promise that resolves to a single, flat array of all BalanceEntry objects for the batch.
   */
  async #processAddressBatch(addressBatch: CurvyAddress[]): Promise<BalanceEntry[]> {
    const resultsForBatch = await Promise.all([
      this.#processSaBalances(addressBatch),
      this.#processCsucBalances(addressBatch.filter((address) => address.networkFlavour === "evm")),
    ]);

    return resultsForBatch.flat();
  }

  async #noteScan(
    walletId: string,
    _environment: NETWORK_ENVIRONMENT_VALUES,
    options?: {
      onProgress?: (entries: BalanceEntry[]) => void;
      scanAll?: boolean;
    },
  ) {
    // TODO This process happens in memory, may be a problem with thousands of notes on mobile phones

    const onProgress = options?.onProgress;

    try {
      const { notes: publicNotes } = await this.apiClient.aggregator.GetAllNotes();

      const { s, v, babyJubjubPublicKey } = this.#walletManager.activeWallet.keyPairs;
      const bjjParts = babyJubjubPublicKey.split(".");
      if (bjjParts.length !== 2) {
        throw new Error("Invalid BabyJubjub public key format.");
      }
      const babyJubPublicKey = [bjjParts[0], bjjParts[1]] as [string, string];

      const noteOwnershipData = this.#core.getNoteOwnershipData(publicNotes, s, v);

      const noteBatchCount = Math.ceil(noteOwnershipData.length / this.#NOTE_BATCH_SIZE);
      for (let batchNumber = 0; batchNumber < noteBatchCount; batchNumber += 1) {
        const { proof, publicSignals: ownerHashes } = await this.#core.generateNoteOwnershipProof(
          noteOwnershipData.slice(batchNumber * this.#NOTE_BATCH_SIZE, (batchNumber + 1) * this.#NOTE_BATCH_SIZE),
          babyJubjubPublicKey,
        );

        const { notes: authenticatedNotes } = await this.apiClient.aggregator.SubmitNotesOwnerhipProof({
          proof,
          ownerHashes,
        });

        const unpackedNotes = this.#core.unpackAuthenticatedNotes(s, v, authenticatedNotes, babyJubPublicKey);

        try {
          const noteEntries = await this.#processNotes(
            unpackedNotes.map((n) => {
              console.log(n);
              return n.serializeFullNote();
            }),
          );
          if (noteEntries.length > 0) {
            if (onProgress) onProgress(noteEntries);
            await this.#storage.updateBalancesAndTotals(walletId, noteEntries);
          }
        } catch (error) {
          console.error(`[BalanceScanner] Error while processing note batch ${batchNumber}:`, error);
        } finally {
          this.#scanProgress.notes = (batchNumber + 1) / noteBatchCount;
          this.#emitter.emitBalanceRefreshProgress({
            walletId,
            progress: Math.round(this.totalScanProgress),
          });
        }
      }
    } catch (error) {
      this.#scanProgress.notes = 1;
      console.error("[BalanceScanner] Error while fetching notes:", error);
    }
  }

  async #addressScan(
    walletId: string,
    environment: NETWORK_ENVIRONMENT_VALUES,
    options?: {
      onProgress?: (entries: BalanceEntry[]) => void;
      scanAll?: boolean;
    },
  ) {
    const onProgress = options?.onProgress;
    const scanAll = options?.scanAll ?? false;

    try {
      const addresses = await this.#storage.getScannableAddresses(walletId, environment, scanAll ? 0 : undefined);

      const addressCount = addresses.length;

      const addressBatchCount = Math.ceil(addressCount / this.#ADDRESS_BATCH_SIZE);

      for (let batchNumber = 0; batchNumber < addressBatchCount; batchNumber += 1) {
        const addressBatch = addresses.slice(
          batchNumber * this.#ADDRESS_BATCH_SIZE,
          (batchNumber + 1) * this.#ADDRESS_BATCH_SIZE,
        );

        try {
          const combinedEntries = await this.#processAddressBatch(addressBatch); // Assumes a helper for clarity

          if (combinedEntries.length > 0) {
            if (onProgress) onProgress(combinedEntries);

            await this.#storage.updateBalancesAndTotals(walletId, combinedEntries);
          }

          await this.#storage.storeManyCurvyAddresses(
            addressBatch.map((address) => ({
              ...address,
              lastScannedAt: { ...address.lastScannedAt, [environment]: +dayjs() },
            })),
          );
        } catch (error) {
          console.error(`[BalanceScanner] Error while processing address batch ${batchNumber}:`, error);
        } finally {
          this.#scanProgress.addresses = (batchNumber + 1) / addressBatchCount;
          this.#emitter.emitBalanceRefreshProgress({
            walletId,
            progress: Math.round(this.totalScanProgress),
          });
        }
      }
    } catch (error) {
      this.#scanProgress.addresses = 1;
      console.error("[BalanceScanner] Error while fetching addresses:", error);
    }
  }

  /**
   * The main scan coordinator function.
   * @param walletId The ID of the wallet to sync.
   * @param environment {NETWORK_ENVIRONMENT_VALUES} The network environment to scan
   * @param options An object containing the onProgress callback and the batchSize.
   */
  async scanWalletBalances(
    walletId: string,
    environment: NETWORK_ENVIRONMENT_VALUES,
    options?: {
      onProgress?: (entries: BalanceEntry[]) => void;
      scanAll?: boolean;
    },
  ): Promise<void> {
    if (this.#semaphore[`refresh-balances-${walletId}`]) return;

    this.#semaphore[`refresh-balances-${walletId}`] = true;

    this.#resetScanProgress();

    this.#emitter.emitBalanceRefreshStarted({
      walletId,
    });

    try {
      await Promise.all([
        this.#addressScan(walletId, environment, options),
        this.#noteScan(walletId, environment, options),
      ]);
    } finally {
      this.#semaphore[`refresh-balances-${walletId}`] = undefined;

      // TODO add event emitter for error states

      this.#emitter.emitBalanceRefreshComplete({
        walletId,
      });
    }
  }

  async scanAddressBalances(address: CurvyAddress, options?: { onProgress?: (entries: BalanceEntry[]) => void }) {
    if (this.#semaphore[`refresh-balance-${address.id}`]) return;

    this.#semaphore[`refresh-balance-${address.id}`] = true;

    const onProgress = options?.onProgress;

    this.#emitter.emitBalanceRefreshStarted({
      walletId: address.walletId,
    });

    try {
      const combinedEntries = await this.#processAddressBatch([address]);

      if (combinedEntries.length > 0) {
        if (onProgress) onProgress(combinedEntries);

        await this.#storage.updateBalancesAndTotals(address.walletId, combinedEntries);
      }
    } catch (error) {
      console.error(`[BalanceScanner] Error while scanning address balances for address ${address.address}:`, error);
    } finally {
      this.#semaphore[`refresh-balance-${address.id}`] = undefined;

      // TODO add event emitter for error states

      this.#emitter.emitBalanceRefreshComplete({
        walletId: address.walletId,
      });
    }
  }

  async scanNoteBalances(
    walletId: string,
    environment: NETWORK_ENVIRONMENT_VALUES,
    options?: { onProgress?: (entries: BalanceEntry[]) => void; scanAll?: boolean },
  ) {
    if (this.#semaphore[`refresh-notes-${walletId}`]) return;

    this.#semaphore[`refresh-notes-${walletId}`] = true;

    this.#emitter.emitBalanceRefreshStarted({
      walletId,
    });

    try {
      await this.#noteScan(walletId, environment, options);
    } catch (error) {
      console.error(`[BalanceScanner] Error while scanning note balances:`, error);
    } finally {
      this.#semaphore[`refresh-notes-${walletId}`] = undefined;

      // TODO add event emitter for error states

      this.#emitter.emitBalanceRefreshComplete({
        walletId,
      });
    }
  }
}
