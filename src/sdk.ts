import { Buffer as BufferPolyfill } from "buffer";
import { mul, toNumber } from "dnum";
import { getAddress } from "viem";
import { BalanceScanner } from "@/balance-scanner";
import {
  BALANCE_REFRESH_COMPLETE_EVENT,
  BALANCE_REFRESH_PROGRESS_EVENT,
  BALANCE_REFRESH_STARTED_EVENT,
  SCAN_COMPLETE_EVENT,
  SCAN_ERROR_EVENT,
  SCAN_MATCH_EVENT,
  SCAN_PROGRESS_EVENT,
  SYNC_COMPLETE_EVENT,
  SYNC_ERROR_EVENT,
  SYNC_PROGRESS_EVENT,
  SYNC_STARTED_EVENT,
} from "@/constants/events";
import {
  NETWORK_ENVIRONMENT,
  type NETWORK_ENVIRONMENT_VALUES,
  type NETWORK_FLAVOUR_VALUES,
  type NETWORKS,
} from "@/constants/networks";
import { prepareCsucActionEstimationRequest, prepareCuscActionRequest } from "@/csuc";
import { CurvyEventEmitter } from "@/events";
import { ApiClient } from "@/http/api";
import type { IApiClient } from "@/interfaces/api";
import type { ICore } from "@/interfaces/core";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { StorageInterface } from "@/interfaces/storage";
import type { IWalletManager } from "@/interfaces/wallet-manager";
import { EvmRpc } from "@/rpc/evm";
import { newMultiRpc } from "@/rpc/factory";
import type { MultiRpc } from "@/rpc/multi";
import { MapStorage } from "@/storage/map-storage";
import {
  type AggregationRequest,
  type AggregationRequestParams,
  BALANCE_TYPE,
  type DepositRequest,
  type DepositRequestParams,
  isCsucBalanceEntry,
  type Network,
  type WithdrawRequest,
  type WithdrawRequestParams,
} from "@/types";
import type { CurvyAddress } from "@/types/address";
import type { CsucActionPayload, CsucActionSet, CsucEstimatedActionCost } from "@/types/csuc";
import { type CurvyHandle, isValidCurvyHandle } from "@/types/curvy";
import type {
  BalanceRefreshCompleteEvent,
  BalanceRefreshProgressEvent,
  BalanceRefreshStartedEvent,
  ScanCompleteEvent,
  ScanErrorEvent,
  ScanMatchEvent,
  SyncCompleteEvent,
  SyncErrorEvent,
  SyncProgressEvent,
  SyncStartedEvent,
} from "@/types/events";
import type { HexString } from "@/types/helper";
import { Note } from "@/types/note";
import type { RecipientData, StarknetFeeEstimate } from "@/types/rpc";
import { decryptCurvyMessage, encryptCurvyMessage } from "@/utils/encryption";
import { arrayBufferToHex, toSlug } from "@/utils/helpers";
import { getSignatureParams as evmGetSignatureParams } from "./constants/evm";
import { getSignatureParams as starknetGetSignatureParams } from "./constants/starknet";
import { Core } from "./core";
import { deriveAddress } from "./utils/address";
import { generateAggregationHash, generateOutputsHash } from "./utils/aggregator";
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

  readonly apiClient: IApiClient;
  readonly storage: StorageInterface;

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
  }

  get walletManager(): IWalletManager {
    if (!this.#walletManager) {
      throw new Error("Wallet manager is not initialized!");
    }

    return this.#walletManager;
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

    await sdk.#priceUpdate(sdk.#networks);
    sdk.startPriceIntervalUpdate();

    if (networkFilter === undefined) {
      sdk.setActiveNetworks(false); // all mainnets by default
    } else {
      sdk.setActiveNetworks(networkFilter);
    }

    sdk.#walletManager = new WalletManager(sdk.apiClient, sdk.rpcClient, sdk.#emitter, sdk.storage, sdk.#core);
    sdk.#balanceScanner = new BalanceScanner(
      sdk.rpcClient,
      sdk.apiClient,
      sdk.storage,
      sdk.#emitter,
      sdk.#core,
      sdk.#walletManager,
    );

    return sdk;
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

    const { spendingKey, viewingKey } = recipientDetails.publicKeys[0];

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

    return { address, addressId: response.data.id, pubKey: recipientStealthPublicKey };
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

  //TODO Mainnet and testnet should not be active at the same time
  // Add validation to network filter to prevent this

  setActiveNetworks(networkFilter: NetworkFilter) {
    const networks = this.getNetworks(networkFilter);

    const uniqueEnvSet = new Set(networks.map((n) => n.testnet));
    if (uniqueEnvSet.size > 1) {
      throw new Error("Cannot mix mainnet and testnet networks!");
    }

    if (!networks.length) {
      throw new Error(`Network array is empty after filtering with ${networkFilter}`);
    }

    const newRpc = newMultiRpc(networks);
    this.#rpcClient = newRpc;

    const environment = uniqueEnvSet.values().next().value;

    if (environment === undefined) throw new Error("No environment set.");

    this.#state = {
      environment: environment ? NETWORK_ENVIRONMENT.TESTNET : NETWORK_ENVIRONMENT.MAINNET,
      activeNetworks: networks,
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
    const privateKey = this.walletManager.getAddressPrivateKey(from);

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
    const privateKey = this.walletManager.getAddressPrivateKey(from);

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

  async createDeposit(payload: DepositRequest) {
    return this.apiClient.aggregator.SubmitDeposit(payload);
  }

  async createWithdraw(payload: WithdrawRequest) {
    return this.apiClient.aggregator.SubmitWithdraw(payload);
  }

  async createAggregation(payload: AggregationRequest) {
    return this.apiClient.aggregator.SubmitAggregation(payload);
  }

  async getAggregatorRequestStatus(requestId: string) {
    return this.apiClient.aggregator.GetAggregatorRequestStatus(requestId);
  }

  async onboardToCSUC(
    networkIdentifier: NetworkFilter,
    from: CurvyAddress,
    toAddress: HexString | string,
    currencySymbol: string,
    amount: string,
  ) {
    const currency = this.getNetwork(networkIdentifier).currencies.find((c) => c.symbol === currencySymbol);

    if (!currency) {
      throw new Error(`Currency with symbol ${currencySymbol} not found on network ${networkIdentifier}!`);
    }

    const wallet = this.walletManager.getWalletById(from.walletId);
    if (!wallet) {
      throw new Error(`Cannot send from address ${from.id} because it's wallet is not found!`);
    }
    const { s, v } = wallet.keyPairs;

    const {
      spendingPrivKeys: [privateKey],
    } = this.#core.scan(s, v, [from]);

    if (currency.nativeCurrency) {
      const rpc = this.rpcClient.Network(networkIdentifier);

      // TODO For now we only support EVM RPCs for CSUC
      if (rpc instanceof EvmRpc) {
        return rpc.onboardNativeToCSUC(from, privateKey, currency, amount);
      }
    }

    const request = await this.rpcClient
      .Network(networkIdentifier)
      .prepareCSUCOnboardTransactions(networkIdentifier as string, privateKey, toAddress, currency.symbol, amount);

    return await this.apiClient.gasSponsorship.SubmitRequest(request);
  }

  async estimateActionInsideCSUC(
    networkFilter: NetworkFilter,
    actionId: CsucActionSet,
    from: CurvyAddress,
    to: HexString,
    token: HexString,
    _amount: bigint, // Doesn't accept decimal numbers i.e. `0.001`
  ): Promise<CsucEstimatedActionCost> {
    const network = this.getNetwork(networkFilter);

    if (!network.csucContractAddress) {
      throw new Error(`CSUC contract address not found for network ${network.name}`);
    }

    // User creates an action payload, and determines the wanted cost/speed
    const amount = _amount.toString();

    const payload = await prepareCsucActionEstimationRequest(network, actionId, from, to, token, amount);

    const response = await this.apiClient.csuc.EstimateAction({
      payloads: [payload],
    });

    return response.data[0];
  }

  async requestActionInsideCSUC(
    networkFilter: NetworkFilter,
    from: CurvyAddress,
    payload: CsucActionPayload,
    totalFee: string,
  ) {
    const network = this.getNetwork(networkFilter);

    if (!network.csucContractAddress) {
      throw new Error(`CSUC contract address not found for network ${network.name}`);
    }

    const wallet = this.walletManager.getWalletById(from.walletId);
    if (!wallet) {
      throw new Error(`Cannot send from address ${from.id} because it's wallet is not found!`);
    }
    const { s, v } = wallet.keyPairs;

    const {
      spendingPrivKeys: [privateKey],
    } = this.#core.scan(s, v, [from]);

    const { token: currencyAddress } = JSON.parse(payload.encodedData) as any;
    const networkSlug = toSlug(network.name);

    const balanceEntry = await this.storage.getBalanceEntry(
      from.address,
      currencyAddress,
      networkSlug,
      BALANCE_TYPE.CSUC,
    );

    if (!isCsucBalanceEntry(balanceEntry)) {
      throw new Error(`Got an incompatible balance entry`);
    }

    const action = await prepareCuscActionRequest(network, balanceEntry.nonce, privateKey, payload, totalFee);

    const response = await this.apiClient.csuc.SubmitActionRequest({
      action: action,
    });

    return { action, response: response.data };
  }

  createDepositPayload(params: DepositRequestParams): DepositRequest {
    const { recipient, notes, csucTransferAllowanceSignature } = params;
    if (!recipient || !notes || !csucTransferAllowanceSignature) {
      throw new Error("Invalid deposit payload parameters");
    }
    const outputNotes = notes.map((note) =>
      this.#core.sendNote(recipient.S, recipient.V, {
        ownerBabyJubjubPublicKey: note.owner!.babyJubjubPubKey.toString(),
        amount: note.balance!.amount,
        token: note.balance!.token,
      }),
    );

    const { csucContractAddress } = this.getNetwork("localnet");

    return {
      outputNotes,
      csucAddress: csucContractAddress!,
      csucTransferAllowanceSignature,
    };
  }

  createAggregationPayload(params: AggregationRequestParams): AggregationRequest {
    const { inputNotes, outputNotes } = params;

    const { s } = this.walletManager.activeWallet.keyPairs;

    if (outputNotes.length < 2) {
      outputNotes.push(
        new Note({
          ownerHash: 0n,
          balance: {
            amount: 0n,
            token: 0n,
          },
          deliveryTag: {
            ephemeralKey: BigInt(`0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`),
            viewTag: 0n,
          },
        }),
      );
    }

    const msgHash = generateAggregationHash(outputNotes);
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

    for (let i = inputNotes.length; i < 15; i++) {
      inputNotes.push(
        new Note({
          owner: {
            babyJubjubPubKey: {
              x: BigInt(`0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`),
              y: BigInt(`0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`),
            },
            sharedSecret: BigInt(`0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`),
          },
          balance: {
            amount: 0n,
            token: 0n,
          },
          deliveryTag: {
            ephemeralKey: BigInt(`0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`),
            viewTag: 0n,
          },
        }),
      );
    }
    const msgHash = generateOutputsHash(inputNotes);
    const signature = this.#core.signWithBabyJubjubPrivateKey(poseidonHash([msgHash, BigInt(destinationAddress), 0n]), s);
    const signatures = Array.from({ length: 10 }).map(() => ({
      S: BigInt(signature.S),
      R8: signature.R8.map((r) => BigInt(r)),
    }));
    return { inputNotes, signatures, destinationAddress };
  }

  onSyncStarted(listener: (event: SyncStartedEvent) => void) {
    this.#emitter.on(SYNC_STARTED_EVENT, listener);
  }

  onSyncProgress(listener: (event: SyncProgressEvent) => void) {
    this.#emitter.on(SYNC_PROGRESS_EVENT, listener);
  }

  onSyncComplete(listener: (event: SyncCompleteEvent) => void) {
    this.#emitter.on(SYNC_COMPLETE_EVENT, listener);
  }

  onSyncError(listener: (event: SyncErrorEvent) => void) {
    this.#emitter.on(SYNC_ERROR_EVENT, listener);
  }

  onScanProgress(listener: (event: ScanErrorEvent) => void) {
    this.#emitter.on(SCAN_PROGRESS_EVENT, listener);
  }

  onScanComplete(listener: (event: ScanCompleteEvent) => void) {
    this.#emitter.on(SCAN_COMPLETE_EVENT, listener);
  }

  onScanMatch(listener: (event: ScanMatchEvent) => void) {
    this.#emitter.on(SCAN_MATCH_EVENT, listener);
  }

  onScanError(listener: (event: ScanErrorEvent) => void) {
    this.#emitter.on(SCAN_ERROR_EVENT, listener);
  }

  onBalanceRefreshStarted(listener: (event: BalanceRefreshStartedEvent) => void) {
    this.#emitter.on(BALANCE_REFRESH_STARTED_EVENT, listener);
  }
  offBalanceRefreshStarted(listener: (event: BalanceRefreshStartedEvent) => void) {
    this.#emitter.off(BALANCE_REFRESH_STARTED_EVENT, listener);
  }
  onBalanceRefreshProgress(listener: (event: BalanceRefreshProgressEvent) => void) {
    this.#emitter.on(BALANCE_REFRESH_PROGRESS_EVENT, listener);
  }
  offBalanceRefreshProgress(listener: (event: BalanceRefreshProgressEvent) => void) {
    this.#emitter.off(BALANCE_REFRESH_PROGRESS_EVENT, listener);
  }
  onBalanceRefreshComplete(listener: (event: BalanceRefreshCompleteEvent) => void) {
    this.#emitter.on(BALANCE_REFRESH_COMPLETE_EVENT, listener);
  }
  offBalanceRefreshComplete(listener: (event: BalanceRefreshCompleteEvent) => void) {
    this.#emitter.off(BALANCE_REFRESH_COMPLETE_EVENT, listener);
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
}

export { CurvySDK };
