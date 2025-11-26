import { Buffer as BufferPolyfill } from "buffer";
import { mul, toNumber } from "dnum";
import { getAddress } from "viem";
import { BalanceScanner } from "@/balance-scanner";
import {
  NETWORK_ENVIRONMENT,
  type NETWORK_ENVIRONMENT_VALUES,
  type NETWORK_FLAVOUR_VALUES,
  type NETWORKS,
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
import type { Rpc } from "@/rpc/abstract";
import { newMultiRpc } from "@/rpc/factory";
import type { MultiRpc } from "@/rpc/multi";
import { MapStorage } from "@/storage/map-storage";
import type { GetStealthAddressReturnType, Network, RefreshOptions } from "@/types";
import type { CurvyAddress } from "@/types/address";
import { type CurvyHandle, isValidCurvyHandle } from "@/types/curvy";
import type { HexString } from "@/types/helper";
import type { StarknetFeeEstimate } from "@/types/rpc";
import { decryptCurvyMessage, encryptCurvyMessage } from "@/utils/encryption";
import { arrayBufferToHex, toSlug } from "@/utils/helpers";
import { getSignatureParams as evmGetSignatureParams } from "./constants/evm";
import { getSignatureParams as starknetGetSignatureParams } from "./constants/starknet";
import { Core } from "./core";
import { deriveAddress } from "./utils/address";
import { filterNetworks, type NetworkFilter, networksToCurrencyMetadata, networksToPriceData } from "./utils/network";
import { WalletManager } from "./wallet-manager";

// biome-ignore lint/suspicious/noExplicitAny: Augment globalThis to include Buffer polyfill
(globalThis as any).Buffer ??= BufferPolyfill;

const PRICE_UPDATE_INTERVAL = 5 * 60 * 10 ** 3;

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

  private constructor(apiKey: string, core: Core, apiBaseUrl?: string, storage: StorageInterface = new MapStorage()) {
    this.#core = core;
    this.apiClient = new ApiClient(apiKey, apiBaseUrl);
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

  getRpcClient(network: NetworkFilter): Rpc {
    if (!this.#rpcClient) {
      throw new Error("Rpc client is not initialized!");
    }

    return this.#rpcClient.Network(network);
  }

  static async init(
    apiKey: string,
    networkFilter: NetworkFilter = undefined,
    apiBaseUrl?: string,
    storage?: StorageInterface,
    wasmUrl?: string,
    commandFactory?: ICommandFactory,
  ) {
    const core = new Core(wasmUrl);

    const sdk = new CurvySDK(apiKey, core, apiBaseUrl, storage);

    sdk.#networks = await sdk.apiClient.network.GetNetworks();
    await sdk.storage.upsertCurrencyMetadata(networksToCurrencyMetadata(sdk.#networks));

    if (networkFilter === undefined) {
      await sdk.setActiveNetworks(false); // all mainnets by default
    } else {
      await sdk.setActiveNetworks(networkFilter);
    }

    await sdk.#priceUpdate(sdk.#networks);
    sdk.startPriceIntervalUpdate();

    sdk.#walletManager = new WalletManager(sdk.apiClient, sdk.rpcClient, sdk.#emitter, sdk.storage, sdk.#core);
    sdk.#balanceScanner = new BalanceScanner(
      sdk.rpcClient,
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

  static async DANGER_DO_NOT_USE_init(): Promise<CurvySDK> {
    const core = new Core();
    await core.loadWasm();
    return new CurvySDK("", core);
  }

  get commandExecutor() {
    if (!this.#commandExecutor) {
      throw new Error("Command executor is not initialized!");
    }

    return this.#commandExecutor;
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

  startPriceIntervalUpdate({ runImmediately }: { runImmediately?: boolean } = { runImmediately: false }) {
    if (this.#priceRefreshInterval) {
      throw new Error("Price refresh interval is already started!");
    }

    if (runImmediately) {
      this.#priceUpdate();
    }

    this.#priceRefreshInterval = setInterval(() => this.#priceUpdate(), PRICE_UPDATE_INTERVAL);
  }

  stopPriceIntervalUpdate() {
    if (this.#priceRefreshInterval) {
      clearInterval(this.#priceRefreshInterval);
      this.#priceRefreshInterval = undefined;
    }
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

  get activeEnvironment() {
    return this.#state.environment;
  }

  getStealthAddressById(id: string) {
    return this.storage.getCurvyAddressById(id);
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

  getNetworkBySlug(networkSlug: NETWORKS) {
    const networks = this.getNetworks((network) => toSlug(network.name) === networkSlug);

    if (networks.length !== 1) {
      return undefined;
    }

    return networks[0];
  }

  async generateNewStealthAddressForUser(networkIdentifier: NetworkFilter, handle: string) {
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

  async generateAndRegisterNewStealthAddressForUser(networkIdentifier: NetworkFilter, handle: string) {
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

  async getAddressEncryptedMessage(address: CurvyAddress) {
    const { data } = await this.apiClient.announcement.GetAnnouncementEncryptedMessage(address.id);

    if (!data || !data.encryptedMessage || !data.encryptedMessageSenderPublicKey) {
      throw new Error(`No encrypted message found for address ${address.address}`);
    }

    const { encryptedMessage, encryptedMessageSenderPublicKey } = data;

    const wallet = this.walletManager.getWalletById(address.walletId);
    if (!wallet) {
      throw new Error(`Cannot get message for address ${address.id} because it's wallet is not found!`);
    }
    const { s, v } = wallet.keyPairs;

    const {
      spendingPrivKeys: [privateKey],
    } = await this.#core.scan(s, v, [address]);

    return decryptCurvyMessage(
      { data: encryptedMessage, senderSAPublicKey: encryptedMessageSenderPublicKey },
      privateKey,
    );
  }

  getNativeCurrencyForNetwork(network: Network) {
    const nativeCurrency = network.currencies.find((c) => c.nativeCurrency);

    if (!nativeCurrency) {
      throw new Error(`No native currency found for network ${network.name}`);
    }

    return nativeCurrency;
  }

  async getSignatureParamsForNetworkFlavour(flavour: NETWORK_FLAVOUR_VALUES, ownerAddress: string, password: string) {
    const encoder = new TextEncoder();

    let address = ownerAddress;

    if (flavour === "evm") {
      address = getAddress(ownerAddress); // If it's EVM connection, do EIP-55 checksum of address
    } else if (flavour === "starknet") {
      address = `0x${ownerAddress.replace("0x", "").padStart(64, "0")}`; // If it's Starknet, pad with 0s up to 64 chars
    }

    const preimage = `${address}::${password}`;
    const encodedPreimage = encoder.encode(preimage);
    const hash = await crypto.subtle.digest("SHA-512", encodedPreimage);
    const hexHash = arrayBufferToHex(hash);

    switch (flavour) {
      case "evm":
        return evmGetSignatureParams(hexHash);
      case "starknet":
        return starknetGetSignatureParams(hexHash);
      default:
        throw new Error(`Unrecognized network flavour: ${flavour}`);
    }
  }

  async setActiveNetworks(networkFilter: NetworkFilter) {
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

    if (this.#balanceScanner) this.#balanceScanner.rpcClient = newRpc;
  }

  switchNetworkEnvironment(environment: "mainnet" | "testnet") {
    this.setActiveNetworks(environment === "testnet");
  }

  async refreshNoteBalances(walletId = this.walletManager.activeWallet.id, options: RefreshOptions = {}) {
    if (!this.walletManager.hasWallet(walletId)) {
      throw new Error(`Wallet with ID ${walletId} not found!`);
    }

    if (!this.#balanceScanner) {
      throw new Error("Balance scanner not initialized!");
    }

    return await this.#balanceScanner.scanNoteBalances(walletId, this.#state.environment, options);
  }

  async refreshAddressBalances(address: CurvyAddress) {
    if (!this.#balanceScanner) throw new Error("Balance scanner not initialized!");

    return this.#balanceScanner.scanAddressBalances(address);
  }

  async refreshWalletBalances(
    walletId = this.walletManager.activeWallet.id,
    scanAll = false,
    options: RefreshOptions = {},
  ) {
    if (!this.walletManager.hasWallet(walletId)) {
      throw new Error(`Wallet with ID ${walletId} not found!`);
    }

    if (!this.#balanceScanner) {
      throw new Error("Balance scanner not initialized!");
    }

    return await this.#balanceScanner.scanWalletBalances(walletId, this.#state.environment, { scanAll, ...options });
  }

  async refreshBalances(scanAll = false, options: RefreshOptions = {}) {
    if (!this.#balanceScanner) throw new Error("Balance scanner not initialized!");

    for (const wallet of this.walletManager.wallets) {
      await this.#balanceScanner.scanWalletBalances(wallet.id, this.#state.environment, { scanAll, ...options });
    }
  }

  async resetStorage() {
    this.stopPriceIntervalUpdate();
    await this.storage.clearStorage();
    this.startPriceIntervalUpdate({ runImmediately: true });

    for (const wallet of this.walletManager.wallets) {
      await this.storage.storeCurvyWallet(wallet);
    }

    await this.walletManager.rescanWallets();
    await this.refreshBalances();
  }

  async estimateFee(
    from: CurvyAddress,
    networkIdentifier: NetworkFilter,
    to: HexString | CurvyHandle,
    amount: string,
    currency: string,
  ) {
    const privateKey = await this.walletManager.getAddressPrivateKey(from);

    let recipientAddress: HexString;

    if (isValidCurvyHandle(to))
      recipientAddress = (await this.generateAndRegisterNewStealthAddressForUser(networkIdentifier, to)).address;
    else recipientAddress = to;

    const rpc = this.rpcClient.Network(networkIdentifier);
    const nativeToken = this.getNetwork(networkIdentifier).currencies.find((c) => c.nativeCurrency)!;
    const fee = await rpc.estimateFee(from, privateKey, recipientAddress, amount, currency);
    const raw = rpc.feeToAmount(fee);
    const fiat = toNumber(
      mul([raw, nativeToken.decimals], (await this.storage.getCurrencyPrice(nativeToken.symbol)).price),
    );

    const tokenMeta = {
      decimals: nativeToken.decimals,
      symbol: nativeToken.symbol,
    };

    return { raw, fiat, tokenMeta, estimation: fee };
  }

  async send(
    from: CurvyAddress,
    networkIdentifier: NetworkFilter,
    to: CurvyHandle | HexString,
    amount: string,
    currency: string,
    fee: StarknetFeeEstimate | bigint,
    message?: string,
  ) {
    const privateKey = await this.walletManager.getAddressPrivateKey(from);

    let recipientAddress: HexString;

    if (isValidCurvyHandle(to)) {
      const { address, announcementData } = await this.generateAndRegisterNewStealthAddressForUser(
        networkIdentifier,
        to,
      );

      recipientAddress = address;

      if (message && announcementData.id && announcementData.publicKey) {
        await this.apiClient.announcement.UpdateAnnouncementEncryptedMessage(announcementData.id, {
          encryptedMessage: JSON.stringify(await encryptCurvyMessage(message, privateKey, announcementData.publicKey)),
          encryptedMessageSenderPublicKey: from.publicKey,
        });
      }
    } else recipientAddress = to;

    return this.rpcClient
      .Network(networkIdentifier)
      .sendToAddress(from, privateKey, recipientAddress, amount, currency, fee);
  }

  async pollForCriteria<T>(
    pollFunction: () => Promise<T>,
    pollCriteria: (res: T) => boolean,
    maxRetries = 120,
    delayMs = 10000,
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      const res = await pollFunction();

      if (pollCriteria(res)) {
        return res;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error(`Polling failed!`);
  }

  async getNewNoteForUser(handle: string, token: bigint, amount: bigint) {
    const { data: recipientDetails } = await this.apiClient.user.ResolveCurvyHandle(handle);

    if (!recipientDetails) {
      throw new Error(`Handle ${handle} not found`);
    }

    const { spendingKey, viewingKey, babyJubjubPublicKey } = recipientDetails.publicKeys;
    if (!babyJubjubPublicKey) {
      throw new Error(`BabyJubjub public key not found for handle ${handle}`);
    }
    return this.#core.sendNote(spendingKey, viewingKey, {
      ownerBabyJubjubPublicKey: babyJubjubPublicKey,
      amount,
      token,
    });
  }
}

export { CurvySDK };
