import { Buffer as BufferPolyfill } from "buffer";
import dayjs from "dayjs";
import { mul, toNumber } from "dnum";
import { ec, validateAndParseAddress } from "starknet";
import { getAddress, parseSignature, verifyTypedData } from "viem";
import { CSUC_TOKENS } from "@/constants/csuc";
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
import { NETWORK_FLAVOUR, type NETWORK_FLAVOUR_VALUES, type NETWORKS } from "@/constants/networks";
import { CURVY_HANDLE_REGEX } from "@/constants/regex";
import { prepareCsucActionEstimationRequest, prepareCuscActionRequest } from "@/csuc";
import { CurvyEventEmitter } from "@/events";
import { ApiClient } from "@/http/api";
import type { IApiClient } from "@/interfaces/api";
import type { ICore } from "@/interfaces/core";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { StorageInterface } from "@/interfaces/storage";
import type { IWalletManager } from "@/interfaces/wallet-manager";
import { newMultiRpc } from "@/rpc/factory";
import type { MultiRpc } from "@/rpc/multi";
import type { StarknetRpc } from "@/rpc/starknet";
import { TemporaryStorage } from "@/storage/temporary-storage";
import type { CurvyAddress, CurvyAddressBalances, CurvyAddressCsucNonces } from "@/types/address";
import type { AggregationRequest, Currency, DepositPayload, Network, WithdrawPayload } from "@/types/api";
import {
  type CsucActionPayload,
  type CsucActionSet,
  type CsucActionStatus,
  type CsucEstimatedActionCost,
  CsucSupportedNetwork,
  CsucSupportedNetworkId,
} from "@/types/csuc";
import { assertCurvyHandle, type CurvyHandle, isValidCurvyHandle } from "@/types/curvy";
import type {
  BalanceRefreshCompleteEvent,
  BalanceRefreshProgressEvent,
  BalanceRefreshStartedEvent,
  ScanCompleteEvent,
  ScanErrorEvent,
  ScanMatchEvent,
  SyncErrorEvent,
  SyncProgressEvent,
  SyncStartedEvent,
} from "@/types/events";
import { type HexString, isHexString, isStarkentSignature } from "@/types/helper";
import type { RecipientData, StarknetFeeEstimate } from "@/types/rpc";
import {
  assertIsStarkentSignatureData,
  type EvmSignatureData,
  type EvmSignTypedDataParameters,
  type StarknetSignatureData,
} from "@/types/signature";
import { parseDecimal } from "@/utils/currency";
import { encryptCurvyMessage } from "@/utils/encryption";
import { arrayBufferToHex, generateWalletId, toSlug } from "@/utils/helpers";
import { getSignatureParams as evmGetSignatureParams } from "./constants/evm";
import { getSignatureParams as starknetGetSignatureParams } from "./constants/starknet";
import { Core } from "./core";
import { computePrivateKeys, deriveAddress } from "./utils/address";
import { filterNetworks, type NetworkFilter, networksToPriceData } from "./utils/network";
import { CurvyWallet } from "./wallet";
import { WalletManager } from "./wallet-manager";

// biome-ignore lint/suspicious/noExplicitAny: Augment globalThis to include Buffer polyfill
(globalThis as any).Buffer ??= BufferPolyfill;

const PRICE_UPDATE_INTERVAL = 5 * 60 * 10 ** 3;

class CurvySDK implements ICurvySDK {
  readonly #emitter: ICurvyEventEmitter;
  readonly #core: ICore;
  readonly #walletManager: IWalletManager;
  #priceRefreshInterval: NodeJS.Timeout | undefined;

  #networks: Network[];
  #rpcClient: MultiRpc | undefined;

  readonly apiClient: IApiClient;
  readonly storage: StorageInterface;

  readonly #semaphore: Partial<Record<string, boolean>>;

  private constructor(
    apiKey: string,
    core: Core,
    apiBaseUrl?: string,
    storage: StorageInterface = new TemporaryStorage(),
  ) {
    this.#core = core;
    this.apiClient = new ApiClient(apiKey, apiBaseUrl);
    this.#emitter = new CurvyEventEmitter();
    this.#networks = [];
    this.storage = storage;
    this.#walletManager = new WalletManager(this.apiClient, this.#emitter, this.storage, this.#core);
    this.#semaphore = Object.create(null);
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

    await sdk.#priceUpdate(sdk.#networks);
    sdk.startPriceIntervalUpdate();

    if (networkFilter === undefined) {
      sdk.setActiveNetworks(false); // all mainnets by default
    } else {
      sdk.setActiveNetworks(networkFilter);
    }

    return sdk;
  }

  async #priceUpdate(_networks?: Array<Network>) {
    const networks = _networks ?? (await this.apiClient.network.GetNetworks());
    const priceMap = networksToPriceData(networks);
    await this.storage.updatePriceData(priceMap);
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

  get wallets() {
    return this.#walletManager.wallets;
  }

  get activeWallet() {
    return this.#walletManager.activeWallet;
  }

  hasActiveWallet() {
    return this.#walletManager.hasActiveWallet();
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

    return { address, id: response.data.id, pubKey: recipientStealthPublicKey };
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

  setActiveNetworks(networkFilter: NetworkFilter) {
    const networks = this.getNetworks(networkFilter);
    if (!networks.length) {
      throw new Error(`Network array is empty after filtering with ${networkFilter}`);
    }
    this.#rpcClient = newMultiRpc(networks);
  }

  /* TODO: Think about how to handle networks better
   *       SDK should probably be initialized explicitly with networks and switching should happen among them
   *       eg. someone only passes mainnet networks, switching to 'testnet' then throws an error or warning
   *       We could provide some general ready to use filters (eg. starknet networks, evm networks...)
   */

  switchNetworkEnvironment(environment: "mainnet" | "testnet") {
    return this.setActiveNetworks(environment === "testnet");
  }

  async #verifySignature(
    flavour: NETWORK_FLAVOUR_VALUES,
    signature: EvmSignatureData | StarknetSignatureData,
  ): Promise<[r: string, s: string]> {
    const { signatureParams, signingAddress, signatureResult } = signature;

    switch (true) {
      case NETWORK_FLAVOUR.EVM && isHexString(signatureResult): {
        const signature = parseSignature(signatureResult);

        const isValidSignature = verifyTypedData({
          signature,
          address: signingAddress,
          ...(signatureParams as EvmSignTypedDataParameters),
        });

        if (!isValidSignature) {
          throw new Error("Signature verification failed. Invalid signature.");
        }

        return [signature.r, signature.s];
      }
      case NETWORK_FLAVOUR.STARKNET && isStarkentSignature(signatureResult): {
        assertIsStarkentSignatureData(signature);

        const { signingWalletId, msgHash } = signature;

        if (!signatureResult[0] || !signatureResult[1]) throw new Error("Signature failed - too few values.");

        let r = "-1";
        let s = "-1";
        switch (signingWalletId) {
          case "argentX": {
            if (signatureResult.length === 2) {
              [r, s] = signatureResult as [string, string];
            }

            if (signatureResult.length === 5) {
              [r, s] = signatureResult.slice(3) as [string, string];
            }
            break;
          }
          case "braavos": {
            if (signatureResult.length !== 3) {
              throw new Error("Only braavos single signer account is supported.");
            }

            [r, s] = signatureResult.slice(1) as [string, string];
            break;
          }
          default: {
            throw new Error(`Unrecognized wallet type: ${signingWalletId}. Only argentX and braavos are supported.`);
          }
        }

        if (r === "-1" || s === "-1") {
          throw new Error("Signature verification failed - r or s is not defined.");
        }

        const signingPublicKey = await (
          this.#rpcClient?.Network("Starknet") as StarknetRpc
        ).getAccountPubKeyForSignatureVerification(signingWalletId, signingAddress);

        const _msgHash = msgHash.replace("0x", "");
        const paddedMsgHash = _msgHash.length % 2 === 0 ? _msgHash : `0${_msgHash}`;

        let signatureIsValid = false;
        for (let recoverBit = 0; recoverBit < 4; recoverBit++) {
          try {
            const signature = new ec.starkCurve.Signature(BigInt(r), BigInt(s)).addRecoveryBit(recoverBit);
            const publicKeyCompressed = signature.recoverPublicKey(paddedMsgHash).toHex(true);
            signatureIsValid = publicKeyCompressed.indexOf(signingPublicKey) !== -1;

            if (signatureIsValid) {
              break;
            }
          } catch (e) {
            console.log("Error recovering public key", e, "recoverBit", recoverBit);
          }
        }

        if (!signatureIsValid) {
          throw new Error("Signature verification failed.");
        }

        return [r, s];
      }
      default: {
        throw new Error(`Unrecognized network flavour: ${flavour}`);
      }
    }
  }

  async addWalletWithSignature(flavour: NETWORK_FLAVOUR["EVM"], signature: EvmSignatureData): Promise<CurvyWallet>;
  async addWalletWithSignature(
    flavour: NETWORK_FLAVOUR["STARKNET"],
    signature: StarknetSignatureData,
  ): Promise<CurvyWallet>;
  async addWalletWithSignature(flavour: NETWORK_FLAVOUR_VALUES, signature: EvmSignatureData | StarknetSignatureData) {
    const [r_string, s_string] = await this.#verifySignature(flavour, signature);
    const { s, v } = computePrivateKeys(r_string, s_string);

    const keyPairs = this.#core.getCurvyKeys(s, v);

    const ownerAddress =
      flavour === NETWORK_FLAVOUR.STARKNET
        ? validateAndParseAddress(signature.signingAddress)
        : signature.signingAddress;

    const curvyHandle = await this.apiClient.user.GetCurvyHandleByOwnerAddress(ownerAddress);
    if (!curvyHandle) {
      throw new Error(`No Curvy handle found for owner address: ${ownerAddress}`);
    }

    assertCurvyHandle(curvyHandle);

    const { data: ownerDetails } = await this.apiClient.user.ResolveCurvyHandle(curvyHandle);
    if (!ownerDetails) throw new Error(`Handle ${curvyHandle} does not exist.`);

    const { createdAt, publicKeys } = ownerDetails;

    if (!publicKeys.some(({ viewingKey: V, spendingKey: S }) => V === keyPairs.V && S === keyPairs.S))
      throw new Error(`Wrong password for handle ${curvyHandle}.`);

    const walletId = await generateWalletId(keyPairs.s, keyPairs.v);
    const wallet = new CurvyWallet(walletId, +dayjs(createdAt), curvyHandle, signature.signingAddress, keyPairs);
    await this.#walletManager.addWallet(wallet);

    return wallet;
  }

  async registerWalletWithSignature(
    handle: CurvyHandle,
    flavour: NETWORK_FLAVOUR["EVM"],
    signature: EvmSignatureData,
  ): Promise<CurvyWallet>;
  async registerWalletWithSignature(
    handle: CurvyHandle,
    flavour: NETWORK_FLAVOUR["STARKNET"],
    signature: StarknetSignatureData,
  ): Promise<CurvyWallet>;
  async registerWalletWithSignature(
    handle: CurvyHandle,
    flavour: NETWORK_FLAVOUR_VALUES,
    signature: EvmSignatureData | StarknetSignatureData,
  ) {
    const ownerAddress =
      flavour === NETWORK_FLAVOUR.STARKNET
        ? validateAndParseAddress(signature.signingAddress)
        : signature.signingAddress;

    const curvyHandle = await this.apiClient.user.GetCurvyHandleByOwnerAddress(ownerAddress);
    if (curvyHandle) {
      throw new Error(`Handle ${curvyHandle} already registered, for owner address: ${ownerAddress}`);
    }

    if (!CURVY_HANDLE_REGEX.test(handle))
      throw new Error(
        `Invalid handle format: ${handle}. Curvy handles can only include letters, numbers, and dashes, with a minimum of 3 and maximum length of 20 characters.`,
      );

    const { data: ownerDetails } = await this.apiClient.user.ResolveCurvyHandle(handle);
    if (ownerDetails) throw new Error(`Handle ${handle} already registered.`);

    const [r_string, s_string] = await this.#verifySignature(flavour, signature);
    const { s, v } = computePrivateKeys(r_string, s_string);

    const keyPairs = this.#core.getCurvyKeys(s, v);

    await this.apiClient.user.RegisterCurvyHandle({
      handle,
      ownerAddress,
      publicKeys: [{ viewingKey: keyPairs.V, spendingKey: keyPairs.S }],
    });

    const { data: registerDetails } = await this.apiClient.user.ResolveCurvyHandle(handle);
    if (!registerDetails)
      throw new Error(`Registration validation failed for handle ${handle}. Please try adding the wallet manually.`);

    const walletId = await generateWalletId(keyPairs.s, keyPairs.v);
    const wallet = new CurvyWallet(
      walletId,
      +dayjs(registerDetails.createdAt),
      handle,
      signature.signingAddress,
      keyPairs,
    );
    await this.#walletManager.addWallet(wallet);

    return wallet;
  }

  async removeWallet(walletId: string) {
    return this.#walletManager.removeWallet(walletId);
  }

  async refreshWalletBalances(walletId: string) {
    if (this.#semaphore[`refresh-balances-${walletId}`]) {
      return;
    }

    this.#semaphore[`refresh-balances-${walletId}`] = true;

    if (!this.rpcClient) {
      throw new Error("RpcClient not initialized!");
    }

    if (!this.#walletManager.hasWallet(walletId)) {
      throw new Error(`Wallet with ID ${walletId} not found!`);
    }

    const addresses = await this.storage.getCurvyAddressesByWalletId(walletId);
    let processed = 0;

    this.#emitter.emitBalanceRefreshStarted({
      walletId,
    });

    for (const address of addresses) {
      await this.storage.updateCurvyAddress(address.id, { balances: await this.rpcClient.getBalances(address) });
      processed++;
      this.#emitter.emitBalanceRefreshProgress({
        walletId,
        progress: Math.round((processed / addresses.length) * 100),
      });
    }

    // TODO CSUC balances and nonces, this is a temporary solution, need to move this to a separate method
    const eligibleAddresses = await this.storage.getCurvyAddressesByWalletIdAndFlavour(walletId, "evm");

    if (eligibleAddresses.length !== 0) {
      try {
        const {
          data: { csaInfo },
        } = await this.apiClient.csuc.GetCSAInfo({
          network: CsucSupportedNetwork.ETHEREUM_SEPOLIA,
          csas: eligibleAddresses.map((c) => c.address),
        });

        for (const [idx, address] of eligibleAddresses.entries()) {
          const csaData = csaInfo[idx];
          const network = this.getNetwork(csaData.network);

          const networkSlug = toSlug(network.name);
          const { balances, nonces } = csaData.balances
            .map(({ token, amount }, idx) => {
              const data = CSUC_TOKENS[csaData.network]?.find((c) => getAddress(c.address) === getAddress(token));
              if (!data) return null;

              const { address, symbol, decimals } = data;

              const balance = BigInt(amount);

              return balance
                ? {
                    balance,
                    tokenMeta: {
                      decimals,
                      iconUrl: "",
                      name: symbol,
                      symbol,
                    },
                    networkMeta: {
                      testnet: true,
                      flavour: "evm" as const,
                      group: "Ethereum" as const,
                      slug: networkSlug,
                    },
                    tokenAddress: address,
                    nonce: BigInt(csaData.nonce[idx].value),
                  }
                : null;
            })
            .filter(Boolean)
            .reduce<{ balances: CurvyAddressBalances; nonces: CurvyAddressCsucNonces }>(
              (res, { nonce, ...rest }) => {
                if (!res.balances[networkSlug]) res.balances[networkSlug] = Object.create(null);
                res.balances[networkSlug]![rest.tokenMeta.symbol] = rest;

                if (!res.nonces[networkSlug]) res.nonces[networkSlug] = Object.create(null);
                res.nonces[networkSlug]![rest.tokenMeta.symbol] = nonce;

                return res;
              },
              { balances: Object.create(null), nonces: Object.create(null) },
            );

          await this.storage.updateCurvyAddress(address.id, {
            csuc: {
              balances,
              nonces,
            },
          });
        }
      } catch (e) {
        console.error("Error while fetching CSUC balances and nonces", e);
      }
    }

    this.#emitter.emitBalanceRefreshComplete({
      walletId,
    });

    this.#semaphore[`refresh-balances-${walletId}`] = undefined;
  }

  async refreshBalances() {
    if (this.#semaphore["refresh-balances"]) {
      return;
    }

    this.#semaphore["refresh-balances"] = true;

    if (!this.rpcClient) {
      throw new Error("rpcClient not initialized");
    }

    for (const wallet of this.wallets) {
      await this.refreshWalletBalances(wallet.id);
    }

    this.#semaphore["refresh-balances"] = undefined;
  }

  async refreshAddressBalances(address: CurvyAddress) {
    if (this.#semaphore[`refresh-balance-${address.id}`]) {
      return;
    }

    this.#semaphore[`refresh-balance-${address.id}`] = true;

    if (!this.rpcClient) {
      throw new Error("rpcClient not initialized");
    }

    await this.storage.updateCurvyAddress(address.id, { balances: await this.rpcClient.getBalances(address) });

    /* TODO refactor csuc balances and nonces, this is a temporary solution, need to move this to a separate method
        when other refactoring is done
    * */
    if (Object.values(CsucSupportedNetworkId).includes(address.id)) {
      const {
        data: { csaInfo },
      } = await this.apiClient.csuc.GetCSAInfo({
        network: CsucSupportedNetwork.ETHEREUM_SEPOLIA,
        csas: [address.address],
      });

      const csaData = csaInfo[0];
      const network = this.getNetwork(csaData.network);
      const networkSlug = toSlug(network.name);

      const { balances, nonces } = csaData.balances
        .map(({ token, amount }, idx) => {
          const data = CSUC_TOKENS[csaData.network]?.find((c) => getAddress(c.address) === getAddress(token));
          if (!data) return null;

          const { address, symbol, decimals } = data;

          const balance = BigInt(amount);

          return balance
            ? {
                balance,
                tokenMeta: {
                  decimals,
                  iconUrl: "",
                  name: symbol,
                  symbol,
                },
                networkMeta: {
                  testnet: true,
                  flavour: "evm" as const,
                  group: "Ethereum" as const,
                  slug: networkSlug,
                },
                tokenAddress: address,
                nonce: BigInt(csaData.nonce[idx].value),
              }
            : null;
        })
        .filter(Boolean)
        .reduce<{ balances: CurvyAddressBalances; nonces: CurvyAddressCsucNonces }>(
          (res, { nonce, ...rest }) => {
            if (!res.balances[networkSlug]) res.balances[networkSlug] = Object.create(null);
            res.balances[networkSlug]![rest.tokenMeta.symbol] = rest;

            if (!res.nonces[networkSlug]) res.nonces[networkSlug] = Object.create(null);
            res.nonces[networkSlug]![rest.tokenMeta.symbol] = nonce;

            return res;
          },
          { balances: Object.create(null), nonces: Object.create(null) },
        );
      await this.storage.updateCurvyAddress(address.id, {
        csuc: {
          balances,
          nonces,
        },
      });
    }

    this.#semaphore[`refresh-balance-${address.id}`] = undefined;
  }

  async resetStorage() {
    this.stopPriceIntervalUpdate();
    await this.storage.clearStorage();
    this.startPriceIntervalUpdate({ runImmediately: true });

    for (const wallet of this.wallets) {
      await this.storage.storeCurvyWallet(wallet);
    }

    await this.#walletManager.rescanWallets();
    await this.refreshBalances();
  }

  async estimateFee(
    from: CurvyAddress,
    networkIdentifier: NetworkFilter,
    to: HexString | CurvyHandle,
    amount: string,
    currency: string,
  ) {
    const wallet = this.#walletManager.getWalletById(from.walletId);
    if (!wallet) {
      throw new Error(`Cannot send from address ${from.id} because it's wallet is not found!`);
    }
    const { s, v } = wallet.keyPairs;

    const {
      spendingPrivKeys: [privateKey],
    } = this.#core.scan(s, v, [from]);

    let recipientData: RecipientData;

    if (isValidCurvyHandle(to)) recipientData = await this.getNewStealthAddressForUser(networkIdentifier, to);
    else recipientData = { address: to };

    const rpc = this.rpcClient.Network(networkIdentifier);
    const nativeToken = this.getNetwork(networkIdentifier).currencies.find((c) => c.nativeCurrency)!;
    const fee = await rpc.estimateFee(from, privateKey, recipientData.address, amount, currency);
    const raw = rpc.feeToAmount(fee);
    const fiat = toNumber(mul([raw, nativeToken.decimals], await this.storage.getTokenPrice(nativeToken.symbol)));

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
    const wallet = this.#walletManager.getWalletById(from.walletId);
    if (!wallet) {
      throw new Error(`Cannot send from address ${from.id} because it's wallet is not found!`);
    }
    const { s, v } = wallet.keyPairs;

    const {
      spendingPrivKeys: [privateKey],
    } = this.#core.scan(s, v, [from]);

    let recipientData: RecipientData;

    if (isValidCurvyHandle(to)) {
      recipientData = await this.getNewStealthAddressForUser(networkIdentifier, to);

      if (message && recipientData.addressId && recipientData.pubKey)
        await this.apiClient.announcement.UpdateAnnouncementEncryptedMessage(recipientData.addressId, {
          encryptedMessage: JSON.stringify(await encryptCurvyMessage(message, privateKey, recipientData.pubKey)),
          encryptedMessageSenderPublicKey: from.publicKey,
        });
    } else recipientData = { address: to };

    return this.rpcClient
      .Network(networkIdentifier)
      .sendToAddress(from, privateKey, recipientData.address, amount, currency, fee);
  }

  async createDeposit(payload: DepositPayload) {
    return this.apiClient.aggregator.SubmitDeposit(payload);
  }

  async createWithdraw(payload: WithdrawPayload) {
    return this.apiClient.aggregator.SubmitWithdraw(payload);
  }

  async createAggregation(payload: { aggregations: AggregationRequest[] }) {
    return this.apiClient.aggregator.SubmitAggregation(payload);
  }

  async getAggregatorRequestStatus(requestId: string) {
    return this.apiClient.aggregator.GetAggregatorRequestStatus(requestId);
  }

  async onboardToCSUC(
    from: CurvyAddress,
    toAddress: HexString | string,
    currencySymbol: string,
    amount: bigint | string,
  ) {
    // User creates a request to be onboarded to CSUC

    const wallet = this.#walletManager.getWalletById(from.walletId);
    if (!wallet) {
      throw new Error(`Cannot send from address ${from.id} because it's wallet is not found!`);
    }
    const { s, v } = wallet.keyPairs;

    const {
      spendingPrivKeys: [privateKey],
    } = this.#core.scan(s, v, [from]);

    const request = await this.rpcClient
      .Network("ethereum-sepolia")
      .prepareCSUCOnboardTransactions(privateKey, toAddress, currencySymbol, amount);

    return await this.apiClient.gasSponsorship.SubmitRequest(request);
  }

  async estimateActionInsideCSUC(
    network: CsucSupportedNetwork,
    actionId: CsucActionSet,
    from: CurvyAddress,
    to: HexString,
    token: HexString,
    _amount: bigint | string,
  ): Promise<CsucEstimatedActionCost> {
    // User creates an action payload, and determines the wanted cost/speed
    // TODO: Get eth properly
    const amount = parseDecimal("0.001", { decimals: 18 } as Currency).toString();

    const payload = await prepareCsucActionEstimationRequest(network, actionId, from, to, token, amount);

    const response = await this.apiClient.csuc.EstimateAction({
      payloads: [payload],
    });

    // @ts-ignore
    // TODO remove when we remove strinigify on BE.
    return JSON.parse(response.data.estimatedCosts)[0];
  }

  async requestActionInsideCSUC(
    network: CsucSupportedNetwork,
    from: CurvyAddress,
    payload: CsucActionPayload,
    totalFee: string,
  ): Promise<CsucActionStatus> {
    const wallet = this.#walletManager.getWalletById(from.walletId);
    if (!wallet) {
      throw new Error(`Cannot send from address ${from.id} because it's wallet is not found!`);
    }
    const { s, v } = wallet.keyPairs;

    const {
      spendingPrivKeys: [privateKey],
    } = this.#core.scan(s, v, [from]);

    const action = await prepareCuscActionRequest(network, from, privateKey, payload, totalFee);

    const response = await this.apiClient.csuc.SubmitActionRequest({
      actions: [action],
    });

    return response.data.actionStatuses[0];
  }

  onSyncStarted(listener: (event: SyncStartedEvent) => void) {
    this.#emitter.on(SYNC_STARTED_EVENT, listener);
  }

  onSyncProgress(listener: (event: SyncProgressEvent) => void) {
    this.#emitter.on(SYNC_PROGRESS_EVENT, listener);
  }

  onSyncComplete(listener: (event: SyncProgressEvent) => void) {
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
}

export { CurvySDK };
