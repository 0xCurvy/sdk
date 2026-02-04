import { Buffer as BufferPolyfill } from "buffer";
import { BalanceScanner } from "@/balance-scanner";
import { PRICE_UPDATE_INTERVAL } from "@/constants/intervals";
import {
  NETWORK_ENVIRONMENT,
  type NETWORK_ENVIRONMENT_VALUES,
  type NETWORK_FLAVOUR_VALUES,
} from "@/constants/networks";
import { CurvyEventEmitter } from "@/events";
import { ApiClient } from "@/http/api";
import type { IApiClient } from "@/interfaces/api";
import type { ICore } from "@/interfaces/core";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { StorageInterface } from "@/interfaces/storage";
import type { IWalletManager } from "@/interfaces/wallet-manager";
import { CurvyCommandFactory, type ICommandFactory } from "@/planner/commands/factory";
import { CommandExecutor } from "@/planner/executor";
import type { CurvyPlan } from "@/planner/plan";
import { newMultiRpc } from "@/rpc/factory";
import type { MultiRpc } from "@/rpc/multi";
import { MapStorage } from "@/storage/map-storage";
import type {
  EvmSignatureData,
  GetStealthAddressReturnType,
  Network,
  RefreshOptions,
  StarknetSignatureData,
} from "@/types";
import type { CurvyAddress } from "@/types/address";
import type { CurvyHandle } from "@/types/curvy";
import type { HexString } from "@/types/helper";
import { Core } from "./core";
import { deriveAddress } from "./utils/address";
import { filterNetworks, type NetworkFilter, networksToCurrencyMetadata, networksToPriceData } from "./utils/network";
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

  #networks: Network[];
  #rpcClient: MultiRpc | undefined;
  #state: SdkState;

  #commandExecutor: CommandExecutor | undefined;

  readonly apiClient: IApiClient;
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
  ) {
    const core = new Core(wasmUrl);

    const sdk = new CurvySDK(core, apiBaseUrl, storage);

    sdk.#networks = await sdk.apiClient.network.GetNetworks();
    await sdk.storage.upsertCurrencyMetadata(networksToCurrencyMetadata(sdk.#networks));

    await sdk.#setActiveNetworks(environment === "testnet");

    await sdk.#priceUpdate(sdk.#networks);
    sdk.#startPriceIntervalUpdate();

    sdk.#walletManager = new WalletManager(sdk.apiClient, sdk.rpcClient, sdk.#emitter, sdk.storage, sdk.#core);
    sdk.#balanceScanner = new BalanceScanner(
      sdk.rpcClient,
      sdk.#state.environment,
      sdk.apiClient,
      sdk.storage,
      sdk.#emitter,
      sdk.#core,
      sdk.#walletManager,
    );
    sdk.#commandExecutor = new CommandExecutor(
      commandFactory ?? new CurvyCommandFactory(sdk),
      sdk.#emitter,
      sdk.#balanceScanner,
      sdk.storage,
    );

    return sdk;
  }

  estimatePlan(plan: CurvyPlan) {
    if (!this.#commandExecutor) {
      throw new Error("Command executor is not initialized!");
    }

    return this.#commandExecutor.estimatePlan(plan);
  }

  executePlan(plan: CurvyPlan, walletId?: string) {
    if (!this.#commandExecutor) {
      throw new Error("Command executor is not initialized!");
    }

    return this.#commandExecutor.executePlan(plan, { walletId: walletId ?? this.walletManager.activeWallet.id });
  }

  async #priceUpdate(_networks?: Array<Network>) {
    const networks = _networks ?? (await this.apiClient.network.GetNetworks());
    const priceMap = networksToPriceData(networks);
    if (priceMap.size === 0) {
      console.warn("Could not fetch any price data, skipping price update.");
      return;
    }
    await this.storage.upsertPriceData(priceMap);
  }

  async login(flavour: NETWORK_FLAVOUR_VALUES, signature: EvmSignatureData | StarknetSignatureData, password: string) {
    return this.walletManager.addWalletWithSignature(flavour, signature, password);
  }

  async register(
    handle: CurvyHandle,
    flavour: NETWORK_FLAVOUR_VALUES,
    signature: EvmSignatureData | StarknetSignatureData,
    password: string,
  ) {
    return this.walletManager.registerWalletWithSignature(handle, flavour, signature, password);
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

  async generateNewStealthAddressForUser(networkIdentifier: NetworkFilter, handle: CurvyHandle) {
    const { data: recipientDetails } = await this.apiClient.user.ResolveCurvyHandle(handle);

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

  async generateAndRegisterNewStealthAddressForUser(networkIdentifier: NetworkFilter, handle: CurvyHandle) {
    const stealthAddressData = await this.generateNewStealthAddressForUser(networkIdentifier, handle);

    return this.registerStealthAddressForUser(stealthAddressData);
  }

  async registerStealthAddressForUser({
    address,
    recipientStealthPublicKey,
    ephemeralPublicKey,
    network,
    viewTag,
  }: GetStealthAddressReturnType) {
    const response = await this.apiClient.announcement.CreateAnnouncement({
      recipientStealthAddress: address,
      recipientStealthPublicKey,
      network_id: network.id,
      ephemeralPublicKey,
      viewTag: viewTag,
    });

    if (response.data?.message !== "Saved") throw new Error("Failed to register announcement");

    return {
      address,
      announcementData: {
        createdAt: new Date().toISOString(),
        id: response.data.id,
        networkFlavour: network.flavour,
        viewTag,
        ephemeralPublicKey,
        publicKey: recipientStealthPublicKey,
      },
    };
  }

  async ensResolveCurvyHandle(handle: CurvyHandle, slip0044?: bigint): Promise<HexString> {
    const address = await this.rpcClient.ensResolveCurvyHandle(handle, this.#state.environment, slip0044);

    if (!address) {
      throw new Error(`Handle ${handle} not found via ENS`);
    }

    return address;
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

  async refreshAddressBalances(address: CurvyAddress) {
    if (!this.#balanceScanner) throw new Error("Balance scanner not initialized!");

    return this.#balanceScanner.scanAddressBalances(address);
  }

  async refreshBalances(options: RefreshOptions & { scanAll?: boolean; type?: "all" | "addresses" | "notes" } = {}) {
    if (!this.#balanceScanner) throw new Error("Balance scanner not initialized!");

    for (const wallet of this.walletManager.wallets) {
      await this.#balanceScanner.scanWalletBalances(wallet.id, options);
    }
  }

  async resetStorage() {
    this.#stopPriceIntervalUpdate();
    await this.storage.clearStorage();
    this.#startPriceIntervalUpdate({ runImmediately: true });

    for (const wallet of this.walletManager.wallets) {
      await this.storage.storeCurvyWallet(wallet);
    }

    await this.walletManager.rescanWallets();
    await this.refreshBalances();
  }
}

export { CurvySDK };
