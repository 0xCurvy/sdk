import { Buffer as BufferPolyfill } from "buffer";
import { getAddress } from "viem";
import { BalanceScanner } from "@/balance-scanner";
import { PRICE_UPDATE_INTERVAL } from "@/constants/intervals";
import { NETWORK_ENVIRONMENT, type NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import { portalFactoryAbi } from "@/contracts/evm/abi/portal-factory";
import { CurvyEventEmitter } from "@/events";
import { ApiClient } from "@/http/api";
import type { ICore } from "@/interfaces/core";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { StorageInterface } from "@/interfaces/storage";
import type { IWalletManager } from "@/interfaces/wallet-manager";
import { CurvyCommandFactory, type ICommandFactory } from "@/planner/commands/factory";
import { Planner } from "@/planner/planner";
import type { EstimatedPlan, Intent } from "@/planner/type";
import type { EvmRpc } from "@/rpc/evm";
import { newMultiRpc } from "@/rpc/factory";
import type { MultiRpc } from "@/rpc/multi";
import { SessionKeystore } from "@/session-keystore";
import { MapStorage } from "@/storage/map-storage";
import type { CurvyKeyPairs, EvmSignatureData, MatchedPortalRecord, Network, RefreshOptions } from "@/types";
import type { CurvyId } from "@/types/curvy";
import type { HexString } from "@/types/helper";
import { filterNetworks, type NetworkFilter, networksToCurrencyMetadata, networksToPriceData } from "@/utils";
import { poseidonHash } from "@/utils/poseidon-hash";
import { CurvyWallet } from "@/wallet";
import { Core } from "./core";
import { PortalRecovery } from "./portal-recovery";
import { deriveAddress } from "./utils";
import { WalletManager } from "./wallet-manager";

// biome-ignore lint/suspicious/noExplicitAny: Augment globalThis to include Buffer polyfill
(globalThis as any).Buffer ??= BufferPolyfill;

type SdkState = {
  environment: NETWORK_ENVIRONMENT_VALUES;
  activeNetworks: Network[];
};

class CurvySDK implements ICurvySDK {
  readonly #emitter: ICurvyEventEmitter;
  readonly #core: ICore;
  #walletManager: IWalletManager | undefined;
  #balanceScanner: BalanceScanner | undefined;
  #priceRefreshInterval: NodeJS.Timeout | undefined;
  #keystore: SessionKeystore | null = null;

  #networks: Network[];
  #rpcClient: MultiRpc | undefined;
  #state: SdkState;

  #planner: Planner | undefined;
  #portalRecovery: PortalRecovery | undefined;

  readonly apiClient: ApiClient;
  readonly storage: StorageInterface;

  on: ICurvyEventEmitter["on"];
  off: ICurvyEventEmitter["off"];

  private constructor(core: Core, apiBaseUrl?: string, storage: StorageInterface = new MapStorage()) {
    this.#core = core;
    this.apiClient = new ApiClient(apiBaseUrl);
    this.#emitter = new CurvyEventEmitter();
    this.#networks = [];
    this.storage = storage;
    this.#state = {
      environment: "mainnet",
      activeNetworks: [],
    };
    // Must bind for correct this reference
    this.on = this.#emitter.on.bind(this.#emitter);
    this.off = this.#emitter.off.bind(this.#emitter);
  }

  get walletManager(): IWalletManager {
    if (!this.#walletManager) {
      throw new Error("Wallet manager is not initialized!");
    }

    return this.#walletManager;
  }
  get core() {
    return Object.freeze(this.#core);
  }
  get rpcClient() {
    if (!this.#rpcClient) {
      throw new Error("Rpc client is not initialized!");
    }

    return this.#rpcClient;
  }
  get activeNetworks() {
    return this.#state.activeNetworks;
  }

  static async init(
    environment?: NETWORK_ENVIRONMENT_VALUES,
    apiBaseUrl?: string,
    storage?: StorageInterface,
    wasmUrl?: string,
    commandFactory?: ICommandFactory,
    enableKeystore = false,
  ) {
    const core = new Core(wasmUrl);

    const sdk = new CurvySDK(core, apiBaseUrl, storage);

    sdk.#networks = await sdk.apiClient.network.GetNetworks();
    await sdk.storage.upsertCurrencyMetadata(networksToCurrencyMetadata(sdk.#networks));

    await sdk.#setActiveNetworks(environment === "testnet");

    await sdk.#priceUpdate(sdk.#networks);
    sdk.#startPriceIntervalUpdate();

    if (enableKeystore && typeof window !== "undefined") {
      sdk.#keystore = new SessionKeystore({ name: "curvy-keypairs" });
      await sdk.#keystore.ready();

      // Persist JWT to keystore on every token change (initial auth + refresh)
      sdk.apiClient.setOnTokenChange((token) => {
        if (token) {
          sdk.#keystore!.set("__jwt__", token);
        } else {
          sdk.#keystore!.delete("__jwt__");
        }
      });
    }

    sdk.#walletManager = new WalletManager(sdk.apiClient, sdk.storage, sdk.#core, sdk.#keystore);
    sdk.#balanceScanner = new BalanceScanner(
      sdk.rpcClient,
      sdk.#state.environment,
      sdk.apiClient,
      sdk.storage,
      sdk.#emitter,
      sdk.#core,
      sdk.#walletManager,
    );
    sdk.#planner = new Planner(
      commandFactory ?? new CurvyCommandFactory(sdk),
      sdk.#emitter,
      sdk.#balanceScanner,
      sdk.storage,
    );
    sdk.#portalRecovery = new PortalRecovery(sdk.#core, sdk.rpcClient, sdk.#networks);

    // Attempt session restore: if the keystore has keypairs from a previous page load,
    // re-create accounts by combining keypairs (from keystore) with metadata (from storage).
    if (sdk.#keystore && sdk.#keystore.size > 0) {
      // Restore JWT first — if available, we can skip the re-auth round trip
      // (TOTP sign + POST /auth) when adding accounts.
      const persistedJwt = sdk.#keystore.get("__jwt__");
      const hasValidJwt = !!persistedJwt;
      if (hasValidJwt) {
        sdk.apiClient.updateBearerToken(persistedJwt);
      }

      for (const walletId of sdk.#keystore.keys()) {
        if (walletId === "__jwt__") continue; // skip the JWT entry
        try {
          const raw = sdk.#keystore.get(walletId);
          if (!raw) continue;
          const keyPairs = JSON.parse(raw) as CurvyKeyPairs;
          const accountData = await sdk.storage.getCurvyWalletDataById(walletId);
          if (!accountData) continue;

          const account = new CurvyWallet(
            keyPairs,
            accountData.curvyHandle,
            accountData.ownerAddress as HexString,
            accountData.createdAt,
          );
          // Skip bearer token update if we already restored the JWT from keystore.
          // This avoids a full re-auth round trip (TOTP + signature).
          await sdk.walletManager.addWallet(account, hasValidJwt);
        } catch {
          // Account restore failed (metadata missing, corrupt data, etc.) — skip silently.
          // The user can re-authenticate to re-derive keypairs.
        }
      }
    }
    return sdk;
  }

  async getBalances(cached = true) {
    if (!cached) {
      await this.refreshBalances();
    }

    return this.storage.getBalances(this.walletManager.activeWallet.id, this.#state.environment);
  }

  async getTotals(cached = true) {
    if (!cached) {
      await this.refreshBalances();
    }
    return this.storage.getTotals(this.walletManager.activeWallet.id, this.#state.environment);
  }

  async getBalancesByCurrencyAndNetwork(cached = true, currencyAddress: HexString, networkSlug: string) {
    if (!cached) {
      await this.refreshBalances();
    }
    return this.storage.getBalancesByCurrencyAndNetwork(
      this.walletManager.activeWallet.id,
      currencyAddress,
      networkSlug,
    );
  }

  estimate = (intent: Intent) => {
    if (!this.#planner) {
      throw new Error("Command executor is not initialized!");
    }

    return this.#planner.estimate(this, intent);
  };

  execute = (plan: EstimatedPlan) => {
    if (!this.#planner) {
      throw new Error("Command executor is not initialized!");
    }

    return this.#planner.execute(this, plan);
  };

  async #priceUpdate(_networks?: Array<Network>) {
    const networks = _networks ?? (await this.apiClient.network.GetNetworks());
    const priceMap = networksToPriceData(networks);
    if (priceMap.size === 0) {
      console.warn("Could not fetch any price data, skipping price update.");
      return;
    }
    await this.storage.upsertPriceData(priceMap);
  }

  async login(signature: EvmSignatureData) {
    return this.walletManager.addWalletWithSignature(signature);
  }

  async register(handle: CurvyId, signature: EvmSignatureData) {
    return this.walletManager.registerWalletWithSignature(handle, signature);
  }

  #startPriceIntervalUpdate({ runImmediately }: { runImmediately?: boolean } = { runImmediately: false }) {
    if (this.#priceRefreshInterval) {
      throw new Error("Price refresh interval is already started!");
    }

    if (runImmediately) {
      this.#priceUpdate();
    }

    this.#priceRefreshInterval = setInterval(() => this.#priceUpdate(), PRICE_UPDATE_INTERVAL);
  }

  #stopPriceIntervalUpdate() {
    if (this.#priceRefreshInterval) {
      clearInterval(this.#priceRefreshInterval);
      this.#priceRefreshInterval = undefined;
    }
  }

  getNetwork(networkFilter: NetworkFilter = undefined) {
    const networks = filterNetworks(this.#networks, networkFilter);

    if (networks.length === 0) {
      throw new Error(`Expected exactly one, but no network found with filter ${networkFilter}`);
    }

    if (networks.length > 1) {
      throw new Error(`Expected exactly one, but more than one network found with filter ${networkFilter}`);
    }

    return networks[0];
  }

  getNetworks(networkFilter: NetworkFilter = undefined) {
    return filterNetworks(this.#networks, networkFilter);
  }

  async generateNewStealthAddressForUser(networkIdentifier: NetworkFilter, handle: CurvyId) {
    const { data: recipientDetails } = await this.apiClient.user.ResolveCurvyId(handle);

    if (!recipientDetails) {
      throw new Error(`Handle ${handle} not found`);
    }

    const { spendingKey, viewingKey } = recipientDetails.publicKeys;

    const {
      spendingPubKey: recipientStealthPublicKey,
      R: ephemeralPublicKey,
      viewTag,
    } = await this.#core.send(spendingKey, viewingKey);

    const network = this.getNetwork(networkIdentifier);

    const address = deriveAddress(recipientStealthPublicKey, network.flavour);

    if (!address) throw new Error("Couldn't derive address!");

    return { address, recipientStealthPublicKey, viewTag, ephemeralPublicKey, network };
  }

  async ensResolveCurvyId(curvyId: CurvyId, slip0044?: bigint): Promise<HexString> {
    const address = await this.rpcClient.ensResolveCurvyId(curvyId, this.#state.environment, slip0044);

    if (!address) {
      throw new Error(`Handle ${curvyId} not found via ENS`);
    }

    return address;
  }

  async generateEntryPortal(args: { curvyId: CurvyId; coinType?: string; currencyId?: number }): Promise<HexString> {
    return this.apiClient.portal.insertEntryPortal(args).then(({ address }) => address);
  }

  async generateExitPortal(args: {
    curvyId: CurvyId;
    currencyId: number;
    exitAddress: string;
    exitNetworkId?: number;
    exitCurrencyId?: number;
    coinType?: string;
  }): Promise<HexString> {
    return this.apiClient.portal.insertExitPortal(args).then(({ address }) => address);
  }

  async #setActiveNetworks(networkFilter: NetworkFilter) {
    const networks = this.getNetworks(networkFilter);

    const uniqueEnvironmentSet = new Set(networks.map((n) => n.testnet));
    if (uniqueEnvironmentSet.size > 1) {
      throw new Error("Cannot mix mainnet and testnet networks!");
    }

    if (!networks.length) {
      throw new Error(`Network array is empty after filtering with ${networkFilter}`);
    }

    const newRpc = newMultiRpc(networks);
    this.#rpcClient = newRpc;

    const environment = uniqueEnvironmentSet.values().next().value;

    if (environment === undefined) throw new Error("No environment set.");

    this.#state = {
      environment: environment ? NETWORK_ENVIRONMENT.TESTNET : NETWORK_ENVIRONMENT.MAINNET,
      activeNetworks: this.getNetworks(networkFilter),
    };

    if (this.#balanceScanner) {
      this.#balanceScanner.rpcClient = newRpc;
      this.#balanceScanner.environment = this.#state.environment;
    }
  }

  async switchNetworkEnvironment(environment?: "mainnet" | "testnet") {
    const isTestnet = environment ? environment === "testnet" : this.#state.environment === "mainnet"; // If mainnet, toggle to testnet (true)

    await this.#setActiveNetworks(isTestnet);

    return this.#state.environment;
  }

  async findPortal(address: HexString, network: Network): Promise<MatchedPortalRecord | null> {
    const wallet = this.walletManager.activeWallet;

    if (!network.portalFactoryContractAddress) {
      throw new Error(`Provided network ${network.name} does not have PortalFactory contract deployed.`);
    }

    const rpc = this.rpcClient.Network(network.id) as EvmRpc;
    const factoryAddress = network.portalFactoryContractAddress as HexString;
    const checksummedTarget = getAddress(address, +network.chainId);

    const BATCH_SIZE = 200;
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total) {
      const result = await this.apiClient.portal.getPortalRecords({ offset, size: BATCH_SIZE });
      total = result.total;

      if (result.portals.length === 0) break;

      // Scan batch of portals using `core.scan()`
      const scanData = result.portals.map((p) => ({
        ephemeralPublicKey: p.ephemeralKey,
        viewTag: p.viewTag,
      }));

      const { spendingPubKeys } = await this.#core.scan(wallet.keyPairs.s, wallet.keyPairs.v, scanData);

      const [bjjX, bjjY] = wallet.keyPairs.babyJubjubPublicKey.split(".");

      const matched: { index: number; spendingPubKey: string; recoveryAddress: HexString; ownerHash: string }[] = [];
      for (let i = 0; i < spendingPubKeys.length; i++) {
        if (spendingPubKeys[i] === "") continue;

        const spendingPubKey = spendingPubKeys[i];
        const recoveryAddress = deriveAddress(spendingPubKey, "evm");

        const sharedSecret = spendingPubKey.split(".")[0];
        const ownerHash = poseidonHash([BigInt(bjjX), BigInt(bjjY), BigInt(sharedSecret)]).toString();

        matched.push({ index: i, spendingPubKey, recoveryAddress, ownerHash });
      }

      if (matched.length === 0) {
        offset += result.portals.length;
        continue;
      }

      // For matched portals from the batch, use multicall to find portal addresses
      const contracts = matched.map(({ index, recoveryAddress, ownerHash }) => {
        const portal = result.portals[index];
        if (portal.type === "entry") {
          return {
            abi: portalFactoryAbi,
            address: factoryAddress,
            functionName: "getEntryPortalAddress" as const,
            args: [BigInt(ownerHash), recoveryAddress],
          };
        }
        return {
          abi: portalFactoryAbi,
          address: factoryAddress,
          functionName: "getExitPortalAddress" as const,
          args: [portal.exitAddress as HexString, BigInt(portal.exitChainId), recoveryAddress],
        };
      });

      const multicallResults = await rpc.provider.multicall({ contracts });

      for (let j = 0; j < multicallResults.length; j++) {
        const { result: derivedAddress, status } = multicallResults[j];
        if (status !== "success" || !derivedAddress) continue;

        if (getAddress(derivedAddress as string) !== checksummedTarget) continue;

        const { index, recoveryAddress } = matched[j];
        return {
          ...result.portals[index],
          contractAddress: derivedAddress as HexString,
          recoveryAddress,
        };
      }

      offset += result.portals.length;
    }

    return null;
  }

  async refreshBalances(options: RefreshOptions = {}) {
    if (!this.#balanceScanner) throw new Error("Balance scanner not initialized!");

    for (const wallet of this.walletManager.wallets) {
      await this.#balanceScanner.refreshWalletBalances(wallet.id, options);
    }
  }

  async recoverPortal(args: {
    portal: RecoverablePortal;
    destinationAddress: HexString;
    onProgress?: (stage: RecoveryStage) => void;
  }): Promise<HexString> {
    if (!this.#portalRecovery) throw new Error("Portal recovery is not initialized!");

    const { s, v } = this.walletManager.activeWallet.keyPairs;
    if (!s || !v) {
      throw new Error("Active wallet has no private keys available for recovery.");
    }

    return this.#portalRecovery.recoverPortal({
      portal: args.portal,
      destinationAddress: args.destinationAddress,
      spendingPrivateKey: s,
      viewingPrivateKey: v,
      onProgress: args.onProgress,
    });
  }

  async resetStorage() {
    this.#stopPriceIntervalUpdate();
    await this.storage.clearStorage();
    this.#startPriceIntervalUpdate({ runImmediately: true });

    for (const wallet of this.walletManager.wallets) {
      await this.storage.insertCurvyWallet(wallet);
    }

    await this.refreshBalances();
  }
}

export { CurvySDK };
