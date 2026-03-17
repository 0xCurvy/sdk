import dayjs from "dayjs";
import type { IApiClient } from "@/interfaces/api";
import type { IBalanceScanner } from "@/interfaces/balance-scanner";
import type { ICore } from "@/interfaces/core";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import type { StorageInterface } from "@/interfaces/storage";
import type { IWalletManager } from "@/interfaces/wallet-manager";
import type { MultiRpc } from "@/rpc/multi";
import type { BalanceEntry, Network, RefreshOptions } from "@/types";
import type { FullNoteData } from "@/types/note";
import { toSlug } from "@/utils/helpers";
import type { NETWORK_ENVIRONMENT_VALUES } from "./constants/networks";

export class BalanceScanner implements IBalanceScanner {
  readonly #NOTE_BATCH_SIZE = 10;
  readonly #semaphore: Partial<Record<string, boolean>>;
  #scanProgress = {
    notes: 0,
  };

  #rpcClient: MultiRpc;
  environment: NETWORK_ENVIRONMENT_VALUES;
  readonly apiClient: IApiClient;
  readonly #storage: StorageInterface;
  readonly #emitter: ICurvyEventEmitter;
  readonly #core: ICore;
  readonly #walletManager: IWalletManager;

  constructor(
    rpcClient: MultiRpc,
    environment: NETWORK_ENVIRONMENT_VALUES,
    apiClient: IApiClient,
    storage: StorageInterface,
    emitter: ICurvyEventEmitter,
    core: ICore,
    walletManager: IWalletManager,
  ) {
    this.#rpcClient = rpcClient;
    this.environment = environment;
    this.apiClient = apiClient;
    this.#storage = storage;
    this.#emitter = emitter;
    this.#core = core;
    this.#walletManager = walletManager;
    this.#semaphore = Object.create(null);
  }

  pauseBalanceRefreshForWallet(walletId = this.#walletManager.activeWallet.id) {
    this.#semaphore[`refresh-wallet-${walletId}`] = true;
  }

  resumeBalanceRefreshForWallet(walletId = this.#walletManager.activeWallet.id) {
    this.#semaphore[`refresh-wallet-${walletId}`] = false;
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
    return this.#scanProgress.notes * 100;
  }

  #resetScanProgress() {
    this.#scanProgress = {
      notes: 0,
    };
  }

  async #processNotes(notes: FullNoteData[], network: Network) {
    const entries: BalanceEntry[] = [];

    for (let i = 0; i < notes.length; i++) {
      const {
        balance: { token, amount },
        ownerHash,
        owner,
        deliveryTag,
        id,
      } = notes[i];

      if (amount === "0") continue; // Skip zero balance notes

      const networkSlug = toSlug(network.name);

      const vaultTokenId = BigInt(token);

      const { symbol, environment, address, decimals } = await this.#storage.getCurrencyMetadata(
        vaultTokenId,
        networkSlug,
      );

      entries.push({
        walletId: this.#walletManager.activeWallet.id,
        source: `0x${BigInt(ownerHash).toString(16)}`,
        id,

        networkSlug,
        environment,

        currencyAddress: address,
        vaultTokenId,
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

    return entries;
  }

  async #noteScan(
    walletId: string,
    options?: {
      onProgress?: (entries: BalanceEntry[]) => void;
      scanAll?: boolean;
    } & RefreshOptions,
  ) {
    const onProgress = options?.onProgress;
    const signal = options?.signal;

    signal?.throwIfAborted();

    const networks = (await this.apiClient.network.GetNetworks()).filter(
      (network) => network.testnet === (this.environment === "testnet") && !!network.vaultContractAddress,
    );

    if (networks.length === 0) {
      console.warn("[BalanceScanner] No networks available for note scanning.");
      return;
    }

    try {
      const networkCount = networks.length;

      const { s, v, babyJubjubPublicKey } = this.#walletManager.activeWallet.keyPairs;

      const bjjParts = babyJubjubPublicKey.split(".");
      if (bjjParts.length !== 2) {
        throw new Error("Invalid BabyJubjub public key format.");
      }
      const babyJubPublicKey = [bjjParts[0], bjjParts[1]] as [string, string];

      for (let i = 0; i < networkCount; i++) {
        const network = networks[i];
        const scannedNotes: BalanceEntry[] = [];

        const { notes: publicNotes } = await this.apiClient.aggregator.GetAllNotes(network.id);

        const noteOwnershipData = await this.#core.getNoteOwnershipData(publicNotes, s, v);

        const noteBatchCount = Math.ceil(noteOwnershipData.length / this.#NOTE_BATCH_SIZE);

        for (let batchNumber = 0; batchNumber < noteBatchCount; batchNumber += 1) {
          const { proof, publicSignals: ownerHashes } = await this.#core.generateNoteOwnershipProof(
            noteOwnershipData.slice(batchNumber * this.#NOTE_BATCH_SIZE, (batchNumber + 1) * this.#NOTE_BATCH_SIZE),
            babyJubjubPublicKey,
          );

          const { notes: authenticatedNotes } = await this.apiClient.aggregator.SubmitNotesOwnershipProof({
            proof,
            ownerHashes,
            networkId: network.id,
          });

          const unpackedNotes = await this.#core.unpackAuthenticatedNotes(s, v, authenticatedNotes, babyJubPublicKey);

          try {
            const noteEntries = await this.#processNotes(
              unpackedNotes.map((n) => n.serializeFullNote()),
              network,
            );

            // Check and throw immediately after getting entries
            // This effectively cancels processing of the current batch and skips corrupted updates
            signal?.throwIfAborted();

            if (noteEntries.length > 0) {
              if (onProgress) onProgress(noteEntries);
              scannedNotes.push(...noteEntries);
            }
          } catch (error) {
            console.error(`[BalanceScanner] Error while processing note batch ${batchNumber}:`, error);

            // Rethrow abort error to outer catch
            if (typeof error === "string") throw new Error(error, { cause: "abort" });
          } finally {
            this.#scanProgress.notes = ((batchNumber + 1) / noteBatchCount) * (1 / networkCount);

            if (!options?.silent)
              this.#emitter.emitBalanceRefreshProgress({
                environment: this.environment,
                walletId,
                progress: Math.round(this.totalScanProgress),
              });
          }
        }
        await this.#storage.updateBalanceEntries(walletId, toSlug(network.name), scannedNotes);
      }
    } catch (error) {
      console.error("[BalanceScanner] Error while fetching notes:", error);

      // If abort error rethrow to outer catch to emit cancel event
      if (error instanceof Error && error.cause === "abort") throw error;
      else this.#scanProgress.notes = 1;
    }
  }

  /**
   * The main scan coordinator function.
   * @param walletId The ID of the wallet to sync.
   * @param options An object containing the onProgress callback and the batchSize.
   */
  async refreshWalletBalances(
    walletId = this.#walletManager.activeWallet.id,
    options?: {
      onProgress?: (entries: BalanceEntry[]) => void;
    } & RefreshOptions,
  ): Promise<void> {
    if (this.#semaphore[`refresh-wallet-${walletId}`]) return;

    this.#semaphore[`refresh-wallet-${walletId}`] = true;

    this.#resetScanProgress();

    if (!options?.silent)
      this.#emitter.emitBalanceRefreshStarted({
        walletId,
        environment: this.environment,
      });

    try {
      await this.#noteScan(walletId, options);

      if (!options?.silent)
        this.#emitter.emitBalanceRefreshComplete({
          walletId,
          environment: this.environment,
        });
    } catch (e) {
      if (e instanceof Error && e.cause === "abort")
        this.#emitter.emitBalanceRefreshCancelled({ reason: e.message, environment: this.environment });
      else console.error(e);
    } finally {
      this.#semaphore[`refresh-wallet-${walletId}`] = false;
    }
  }
}
