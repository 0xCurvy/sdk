import type { CurvyEventEmitter } from "@/events";
import type { IAddressScanner } from "@/interfaces/address-scanner";
import type { IApiClient } from "@/interfaces/api";
import type { ICore } from "@/interfaces/core";
import type { StorageInterface } from "@/interfaces/storage";
import type { CurvyAddress } from "@/types/address";
import type { RawAnnouncement } from "@/types/api";
import { deriveAddress } from "@/utils/address";
import type { CurvyWallet } from "@/wallet";
import dayjs from "dayjs";

const SYNC_BATCH_SIZE = 200;

class AddressScanner implements IAddressScanner {
  #storage: StorageInterface;
  #client: IApiClient;
  #core: ICore;
  #emitter: CurvyEventEmitter;

  isSyncing: boolean;

  constructor(storage: StorageInterface, core: ICore, client: IApiClient, emitter: CurvyEventEmitter) {
    this.#storage = storage;
    this.#core = core;
    this.#client = client;
    this.#emitter = emitter;

    this.isSyncing = false;
  }

  async #wasmScan(wallet: CurvyWallet, announcements: RawAnnouncement[]) {
    let matched = 0;

    const keyPairs = wallet.keyPairs;
    const { spendingPubKeys } = this.#core.scan(keyPairs.s, keyPairs.v, announcements);

    const addresses = spendingPubKeys
      .map((publicKey, index) => {
        if (publicKey === "") return null;

        const announcement = announcements[index];
        const address = deriveAddress(publicKey, announcement.networkFlavour);

        return {
          ...announcement,
          publicKey,
          address,
          balances: Object.create(null),
          walletId: wallet.id,
          csuc: { balances: Object.create(null), nonces: Object.create(null) },
        } satisfies CurvyAddress;
      })
      .filter(Boolean);

    await this.#storage.storeManyCurvyAddresses(addresses);

    matched++;

    this.#emitter.emitScanProgress({
      scanned: matched,
      wallet,
      total: announcements.length,
    });
  }

  async #scanRecent(wallet: CurvyWallet) {
    let totalProcessed = 0;
    let syncJustStarted = true;

    let total = Number.POSITIVE_INFINITY; // We temporarily set the total to infinity until we know the total.

    while (totalProcessed < total) {
      const {
        scanCursors: { oldest, latest },
        oldestCutoff,
      } = await this.#storage.getScanInfo(wallet.id);

      // If syncing recent announcements, we use the latest cursor to get announcements forwards
      const startTime = latest;
      // If syncing recent announcements, we don't set endTime
      const endTime = undefined;

      const { announcements, total: respTotal } = await this.#client.announcement.GetAnnouncements(
        startTime,
        endTime,
        SYNC_BATCH_SIZE,
      );

      if (announcements.length === 0) {
        // If no announcements found, we can exit the loop
        break;
      }

      if (syncJustStarted) {
        total = respTotal;
        this.#emitter.emitSyncStarted({
          total,
        });
        syncJustStarted = false;
      }

      const newOldest = Math.max(
        oldestCutoff,
        Math.min(oldest ?? Number.POSITIVE_INFINITY, +dayjs(announcements.at(-1)?.createdAt)),
      );
      const newLatest = Math.max(latest ?? 0, +dayjs(announcements.at(0)?.createdAt));

      await this.#storage.updateCurvyWalletData(wallet.id, {
        scanCursors: { latest: newLatest, oldest: newOldest },
      });

      await this.#wasmScan(wallet, announcements);

      totalProcessed += announcements.length;

      // Emit progress for each batch
      this.#emitter.emitSyncProgress({
        synced: totalProcessed,
        announcements,
        remaining: total - totalProcessed,
      });
    }

    this.#emitter.emitSyncComplete({
      totalSynced: totalProcessed,
    });
  }

  async #scanOld(wallet: CurvyWallet) {
    let totalProcessed = 0;
    let syncJustStarted = true;

    let total = Number.POSITIVE_INFINITY; // We temporarily set the total to infinity until we know the total.

    while (totalProcessed < total) {
      const {
        scanCursors: { oldest, latest },
        oldestCutoff,
      } = await this.#storage.getScanInfo(wallet.id);

      const isIncompleteSync = (!latest && !oldest) || (!!oldest && oldest > oldestCutoff);

      if (!isIncompleteSync) break; // If sync complete i.e. oldest cutoff reached, exit loop

      // If syncing for the first time or if history sync was incomplete, we don't set a start time
      const startTime = oldestCutoff;
      // If syncing for the first time or if history sync was incomplete, we use the oldest cursor to get announcements
      // backwards
      const endTime = oldest ?? +dayjs();

      const { announcements, total: respTotal } = await this.#client.announcement.GetAnnouncements(
        startTime,
        endTime,
        SYNC_BATCH_SIZE,
      );

      if (syncJustStarted) {
        total = respTotal;
        this.#emitter.emitSyncStarted({
          total,
        });
        syncJustStarted = false;
      }

      const newOldest =
        announcements.length < SYNC_BATCH_SIZE
          ? oldestCutoff
          : Math.min(oldest ?? Number.POSITIVE_INFINITY, +dayjs(announcements.at(-1)?.createdAt));

      const newLatest = Math.max(latest ?? 0, +dayjs(announcements.at(0)?.createdAt));

      await this.#storage.updateCurvyWalletData(wallet.id, {
        scanCursors: { latest: newLatest, oldest: newOldest },
      });

      await this.#wasmScan(wallet, announcements);

      totalProcessed += announcements.length;

      // Emit progress for each batch
      this.#emitter.emitSyncProgress({
        synced: totalProcessed,
        announcements,
        remaining: total - totalProcessed,
      });
    }

    this.#emitter.emitSyncComplete({
      totalSynced: totalProcessed,
    });
  }

  async scan(wallets: CurvyWallet[]) {
    if (this.isSyncing) {
      return;
    }

    this.isSyncing = true;

    for (const wallet of wallets) {
      try {
        const {
          scanCursors: { latest, oldest },
        } = await this.#storage.getScanInfo(wallet.id);

        const isInitialSync = !latest && !oldest;
        const isIncompleteSync = isInitialSync || (!!oldest && oldest > wallet.createdAt);

        if (!isInitialSync) await this.#scanRecent(wallet);

        if (!isIncompleteSync) {
          this.isSyncing = false;
          continue; // If sync is complete, skip to the next wallet
        }

        await this.#scanOld(wallet);
      } catch (error) {
        this.#emitter.emitSyncError({
          error: error as Error,
        });
        throw error;
      } finally {
        this.isSyncing = false;
      }
    }
  }
}

export { AddressScanner };
