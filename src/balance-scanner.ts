import dayjs from "dayjs";
import type { IApiClient } from "@/interfaces/api";
import type { IBalanceScanner } from "@/interfaces/balance-scanner";
import type { ICore } from "@/interfaces/core";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import type { StorageInterface } from "@/interfaces/storage";
import type { IWalletManager } from "@/interfaces/wallet-manager";
import type { MultiRpc } from "@/rpc/multi";
import type { CsucBalanceEntry, CurvyAddress, NoteBalanceEntry, SaBalanceEntry } from "@/types";
import type { Note } from "@/types/core";
import type { BalanceEntry } from "@/types/storage";
import { toSlug } from "@/utils/helpers";

export class BalanceScanner implements IBalanceScanner {
  readonly #NOTE_BATCH_SIZE = 10;
  readonly #ADDRESS_BATCH_SIZE = 10;
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

  get scanProgress() {
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
      const networks = await this.#storage.getCurvyAddressBalanceNetworks(address.address);

      const saData = await this.rpcClient.getBalances(address, networks);

      for (const networkSlug in saData) {
        for (const currencyAddress in saData[networkSlug]) {
          const balanceData = saData[networkSlug][currencyAddress];

          if (!balanceData) continue;

          entries.push({
            walletId: address.walletId,
            source: address.address,
            type: "sa",

            networkSlug,
            environment: balanceData.environment,

            currencyAddress,
            balance: balanceData.balance,
            symbol: balanceData.symbol,

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
    } = await this.apiClient.csuc.GetCSAInfo({ network: "ethereum-sepolia", csas: addresses.map((a) => a.address) });

    const entries: CsucBalanceEntry[] = [];

    for (let i = 0; i < arrLength; i++) {
      const { balances, address, nonce: nonces, network } = csaInfo[i];
      const balancesLength = balances.length;

      for (let j = 0; j < balancesLength; j++) {
        const { token: currencyAddress, amount } = balances[j];

        const { symbol, environment } = await this.#storage.getCurrencyMetadata(currencyAddress, toSlug(network));

        const balance = BigInt(amount);
        if (balance === 0n) continue; // Skip zero balances

        const nonce = BigInt(nonces[j].value);

        entries.push({
          walletId: addresses[i].walletId,
          source: address,
          type: "csuc",

          networkSlug: toSlug(network),
          environment,

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
  async #processNotes(notes: Note[]): Promise<BalanceEntry[]> {
    const entries: NoteBalanceEntry[] = [];

    for (let i = 0; i < notes.length; i++) {
      const { token, amount, ...noteData } = notes[i];

      if (amount === "0") continue; // Skip zero balance notes

      const networkSlug = "ethereum-sepolia"; // TODO Support multiple networks

      const { symbol, environment, address } = await this.#storage.getCurrencyMetadata(token, networkSlug);

      entries.push({
        walletId: this.#walletManager.activeWallet.id,
        source: "this should be ownerHash", // TODO Get ownerHash somehow
        type: "note",

        networkSlug,
        environment,

        currencyAddress: address,
        symbol,
        balance: BigInt(amount),

        ...noteData,

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

  async #noteScan(walletId: string, onProgress?: (entries: BalanceEntry[]) => void) {
    // TODO This process happens in memory, may be a problem with thousands of notes on mobile phones

    try {
      const { notes: publicNotes } = await this.apiClient.aggregator.GetAllNotes();

      const { s, v, bJJPublicKey } = this.#walletManager.activeWallet.keyPairs;
      const bjjParts = bJJPublicKey.split(".");
      if (bjjParts.length !== 2) {
        throw new Error("Invalid BabyJubJub public key format.");
      }
      const babyJubPublicKey = [bjjParts[0], bjjParts[1]] as [string, string];

      const noteOwnershipData = this.#core.getNoteOwnershipData(publicNotes, s, v);

      const noteBatchCount = Math.ceil(noteOwnershipData.length / this.#NOTE_BATCH_SIZE);
      for (let batchNumber = 0; batchNumber < noteBatchCount; batchNumber += 1) {
        const { proof, publicSignals: ownerHashes } = await this.#core.generateNoteOwnershipProof(
          noteOwnershipData.slice(batchNumber * this.#NOTE_BATCH_SIZE, (batchNumber + 1) * this.#NOTE_BATCH_SIZE),
          bJJPublicKey,
        );

        const { notes: authenticatedNotes } = await this.apiClient.aggregator.SubmitNotesOwnerhipProof({
          proof,
          ownerHashes,
        });

        const unpackedNotes = this.#core.unpackAuthenticatedNotes(s, v, authenticatedNotes, babyJubPublicKey);

        try {
          const noteEntries = await this.#processNotes(unpackedNotes);
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
            progress: Math.round(this.scanProgress),
          });
        }
      }
    } catch (error) {
      this.#scanProgress.notes = 1;
      console.error("[BalanceScanner] Error while fetching notes:", error);
    }
  }

  async #addressScan(walletId: string, onProgress?: (entries: BalanceEntry[]) => void) {
    try {
      const addresses = await this.#storage.getCurvyAddressesByWalletId(walletId);
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
        } catch (error) {
          console.error(`[BalanceScanner] Error while processing address batch ${batchNumber}:`, error);
        } finally {
          this.#scanProgress.addresses = (batchNumber + 1) / addressBatchCount;
          this.#emitter.emitBalanceRefreshProgress({
            walletId,
            progress: Math.round(this.scanProgress),
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
   * @param options An object containing the onProgress callback and the batchSize.
   */
  async scanWalletBalances(
    walletId: string,
    options?: {
      onProgress?: (entries: BalanceEntry[]) => void;
    },
  ): Promise<void> {
    this.#resetScanProgress();

    const onProgress = options?.onProgress;

    this.#emitter.emitBalanceRefreshStarted({
      walletId,
    });

    await Promise.all([this.#addressScan(walletId, onProgress), this.#noteScan(walletId, onProgress)]);

    this.#emitter.emitBalanceRefreshComplete({
      walletId,
    });
  }
}
