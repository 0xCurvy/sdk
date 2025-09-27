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
import type {
  AggregationRequest,
  AggregationRequestParams,
  CurvyEventType,
  Network,
  WithdrawRequest,
  WithdrawRequestParams,
} from "@/types";
import type { CurvyAddress } from "@/types/address";
import { type CurvyHandle, isValidCurvyHandle } from "@/types/curvy";
import type { HexString } from "@/types/helper";
import { Note } from "@/types/note";
import type { RecipientData, StarknetFeeEstimate } from "@/types/rpc";
import { decryptCurvyMessage, encryptCurvyMessage } from "@/utils/encryption";
import { arrayBufferToHex, toSlug } from "@/utils/helpers";
import { getSignatureParams as evmGetSignatureParams } from "./constants/evm";
import { getSignatureParams as starknetGetSignatureParams } from "./constants/starknet";
import { Core } from "./core";
import { deriveAddress } from "./utils/address";
import { generateAggregationHash, generateOutputsHash, MOCK_ERC20_TOKEN_ID } from "./utils/aggregator";
import { filterNetworks, type NetworkFilter, networksToCurrencyMetadata, networksToPriceData } from "./utils/network";
import { poseidonHash } from "./utils/poseidon-hash";
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

  #commandExecutor: CommandExecutor;

  readonly apiClient: IApiClient;
  readonly storage: StorageInterface;

  private constructor(
    apiKey: string,
    core: Core,
    apiBaseUrl?: string,
    storage: StorageInterface = new MapStorage(),
    commandFactory: ICommandFactory = new CurvyCommandFactory(this),
  ) {
    this.#core = core;
    this.apiClient = new ApiClient(apiKey, apiBaseUrl);
    this.#emitter = new CurvyEventEmitter();
    this.#networks = [];
    this.storage = storage;
    this.#state = {
      environment: "mainnet",
      activeNetworks: [],
    };
    this.#commandExecutor = new CommandExecutor(commandFactory, this.#emitter);
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
  ) {
    const core = await Core.init(wasmUrl);

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
      // TODO: Pogledati ovo
      sdk.#rpcClient!,
      sdk.apiClient,
      sdk.storage,
      sdk.#emitter,
      sdk.#core,
      sdk.#walletManager,
    );

    return sdk;
  }

  static async DANGER_DO_NOT_USE_init(): Promise<CurvySDK> {
    const core = await Core.init();
    return new CurvySDK("", core);
  }

  // TODO: Think about calling it just executor
  get commandExecutor() {
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

  // TODO[@lazartravica]: I reimplemented this on the backend, I need to revert and use this
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

  async getNewStealthAddressForUser(networkIdentifier: NetworkFilter, handle: string) {
    const { data: recipientDetails } = await this.apiClient.user.ResolveCurvyHandle(handle);

    if (!recipientDetails) {
      throw new Error(`Handle ${handle} not found`);
    }

    const { spendingKey, viewingKey } = recipientDetails.publicKeys;

    const {
      spendingPubKey: recipientStealthPublicKey,
      R: ephemeralPublicKey,
      viewTag,
    } = this.#core.send(spendingKey, viewingKey);

    const network = this.getNetwork(networkIdentifier);

    const address = deriveAddress(recipientStealthPublicKey, network.flavour);

    if (!address) throw new Error("Couldn't derive address!");

    const response = await this.apiClient.announcement.CreateAnnouncement({
      recipientStealthAddress: address,
      recipientStealthPublicKey,
      network_id: network.id,
      ephemeralPublicKey,
      viewTag: viewTag,
    });

    if (response.data?.message !== "Saved") throw new Error("Failed to register announcement");

    return { address, id: response.data.id, pubKey: recipientStealthPublicKey };
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
    } = this.#core.scan(s, v, [address]);

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

    this.#networks = await newRpc.injectErc1155Ids(this.#networks);

    const environment = uniqueEnvironmentSet.values().next().value;

    if (environment === undefined) throw new Error("No environment set.");

    this.#state = {
      environment: environment ? NETWORK_ENVIRONMENT.TESTNET : NETWORK_ENVIRONMENT.MAINNET,
      activeNetworks: this.getNetworks(networkFilter),
    };

    if (this.#balanceScanner) this.#balanceScanner.rpcClient = newRpc;
  }

  /* TODO: Think about how to handle networks better
   *       SDK should probably be initialized explicitly with networks and switching should happen among them
   *       eg. someone only passes mainnet networks, switching to 'testnet' then throws an error or warning
   *       We could provide some general ready to use filters (eg. starknet networks, evm networks...)
   */

  switchNetworkEnvironment(environment: "mainnet" | "testnet") {
    return this.setActiveNetworks(environment === "testnet");
  }

  async refreshNoteBalances(walletId: string) {
    if (!this.walletManager.hasWallet(walletId)) {
      throw new Error(`Wallet with ID ${walletId} not found!`);
    }

    if (!this.#balanceScanner) {
      throw new Error("Balance scanner not initialized!");
    }

    return await this.#balanceScanner.scanNoteBalances(walletId, this.#state.environment);
  }

  async refreshAddressBalances(address: CurvyAddress) {
    if (!this.#balanceScanner) throw new Error("Balance scanner not initialized!");

    return this.#balanceScanner.scanAddressBalances(address);
  }

  async refreshWalletBalances(walletId: string, scanAll = false) {
    if (!this.walletManager.hasWallet(walletId)) {
      throw new Error(`Wallet with ID ${walletId} not found!`);
    }

    if (!this.#balanceScanner) {
      throw new Error("Balance scanner not initialized!");
    }

    return await this.#balanceScanner.scanWalletBalances(walletId, this.#state.environment, { scanAll });
  }

  async refreshBalances(scanAll = false) {
    if (!this.#balanceScanner) throw new Error("Balance scanner not initialized!");

    for (const wallet of this.walletManager.wallets) {
      await this.#balanceScanner.scanWalletBalances(wallet.id, this.#state.environment, { scanAll });
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

    let recipientData: RecipientData;

    if (isValidCurvyHandle(to)) recipientData = await this.getNewStealthAddressForUser(networkIdentifier, to);
    else recipientData = { address: to };

    const rpc = this.rpcClient.Network(networkIdentifier);
    const nativeToken = this.getNetwork(networkIdentifier).currencies.find((c) => c.nativeCurrency)!;
    const fee = await rpc.estimateFee(from, privateKey, recipientData.address, amount, currency);
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

    let recipientData: RecipientData;

    if (isValidCurvyHandle(to)) {
      recipientData = await this.getNewStealthAddressForUser(networkIdentifier, to);

      if (message && recipientData.addressId && recipientData.pubKey) {
        await this.apiClient.announcement.UpdateAnnouncementEncryptedMessage(recipientData.addressId, {
          encryptedMessage: JSON.stringify(await encryptCurvyMessage(message, privateKey, recipientData.pubKey)),
          encryptedMessageSenderPublicKey: from.publicKey,
        });
      }
    } else recipientData = { address: to };

    return this.rpcClient
      .Network(networkIdentifier)
      .sendToAddress(from, privateKey, recipientData.address, amount, currency, fee);
  }

  createAggregationPayload(params: AggregationRequestParams): AggregationRequest {
    const { inputNotes, outputNotes } = params;

    const { s } = this.walletManager.activeWallet.keyPairs;

    if (outputNotes.length < 2) {
      outputNotes.push({
        ownerHash: "0",
        balance: {
          amount: "0",
          token: "0",
        },
        deliveryTag: {
          ephemeralKey: `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`,
          viewTag: "0",
        },
      });
    }

    const msgHash = generateAggregationHash(outputNotes.map((note) => Note.deserializeAggregationOutputNote(note)));
    const signature = this.#core.signWithBabyJubjubPrivateKey(msgHash, s);
    const signatures = Array.from({ length: 10 }).map(() => ({
      S: BigInt(signature.S),
      R8: signature.R8.map((r) => BigInt(r)),
    }));

    return {
      inputNotes,
      outputNotes,
      signatures,
    };
  }

  createWithdrawPayload(params: WithdrawRequestParams): WithdrawRequest {
    const { inputNotes, destinationAddress } = params;

    if (!inputNotes || !destinationAddress) {
      throw new Error("Invalid withdraw payload parameters");
    }

    const { s } = this.walletManager.activeWallet.keyPairs;

    const inputNotesLength = inputNotes.length;

    // TODO: read circuit config from config
    for (let i = inputNotesLength; i < 2; i++) {
      inputNotes.push(
        new Note({
          owner: {
            babyJubjubPublicKey: {
              x: `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`,
              y: `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`,
            },
            sharedSecret: `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`,
          },
          balance: {
            amount: "0",
            token: MOCK_ERC20_TOKEN_ID,
          },
        }),
      );
    }

    const sortedInputNotes = inputNotes.sort((a, b) => (a.id < b.id ? -1 : 1));

    const msgHash = generateOutputsHash(sortedInputNotes);

    const dstHash = poseidonHash([msgHash, BigInt(destinationAddress)]);

    const signature = this.#core.signWithBabyJubjubPrivateKey(dstHash, s);
    const signatures = Array.from({ length: 10 }).map(() => ({
      S: BigInt(signature.S),
      R8: signature.R8.map((r) => BigInt(r)),
    }));

    return {
      inputNotes: sortedInputNotes.map((note) => note.serializeWithdrawalNote()),
      signatures,
      destinationAddress,
    };
  }

  subscribeToEventType(eventType: CurvyEventType, listener: (event: any) => void) {
    this.#emitter.on(eventType, listener);
  }

  unsubscribeFromEventType(eventType: CurvyEventType, listener: (event: any) => void) {
    this.#emitter.off(eventType, listener);
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
