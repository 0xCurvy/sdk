import dayjs from "dayjs";
import { ec, validateAndParseAddress } from "starknet";
import { parseSignature, verifyTypedData } from "viem";
import { AddressScanner } from "@/address-scanner";
import { NETWORK_FLAVOUR, type NETWORK_FLAVOUR_VALUES } from "@/constants/networks";
import { CURVY_HANDLE_REGEX } from "@/constants/regex";
import type { IAddressScanner } from "@/interfaces/address-scanner";
import type { IApiClient } from "@/interfaces/api";
import type { ICore } from "@/interfaces/core";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import type { StorageInterface } from "@/interfaces/storage";
import type { IWalletManager } from "@/interfaces/wallet-manager";
import type { StarknetRpc } from "@/rpc";
import type { MultiRpc } from "@/rpc/multi";
import {
  type AdditionalWalletData,
  assertCurvyHandle,
  assertIsStarkentSignatureData,
  type CurvyAddress,
  type CurvyHandle,
  type CurvyKeyPairs,
  type CurvyPrivateKeys,
  type EvmSignatureData,
  type EvmSignTypedDataParameters,
  type HexString,
  isHexString,
  isStarkentSignature,
  type Signature,
  type StarknetSignatureData,
  type StringifyBigInts,
} from "@/types";
import { computePrivateKeys } from "@/utils/address";
import { computePasswordHash, signMessage } from "@/utils/encryption";
import { generateWalletId } from "@/utils/helpers";
import { processPasskeyPrf } from "@/utils/passkeys";
import { CurvyWallet } from "@/wallet";

const JWT_REFRESH_INTERVAL = 14 * (60 * 10 ** 3);
const SCAN_REFRESH_INTERVAL = 15 * 10 ** 3;

class WalletManager implements IWalletManager {
  readonly #apiClient: IApiClient;
  readonly #rpcClient: MultiRpc;
  readonly #storage: StorageInterface;
  readonly #core: ICore;
  readonly #wallets: Map<string, CurvyWallet>;
  readonly #addressScanner: IAddressScanner;

  #scanInterval: NodeJS.Timeout | null;
  #jwtRefreshInterval: NodeJS.Timeout | null;
  #activeWallet: Readonly<CurvyWallet> | null;

  constructor(
    client: IApiClient,
    rpcClient: MultiRpc,
    emitter: ICurvyEventEmitter,
    storage: StorageInterface,
    core: ICore,
  ) {
    this.#apiClient = client;
    this.#rpcClient = rpcClient;
    this.#wallets = new Map<string, CurvyWallet>();
    this.#storage = storage;
    this.#core = core;
    this.#addressScanner = new AddressScanner(storage, core, client, emitter);

    this.#scanInterval = null;
    this.#jwtRefreshInterval = null;

    this.#activeWallet = null;
  }

  get activeWallet() {
    if (!this.#activeWallet) {
      throw new Error("No active wallet set.");
    }
    return Object.freeze(this.#activeWallet);
  }

  get wallets() {
    return Array.from(this.#wallets.values()).filter((wallet) => !wallet.isPartial);
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

  async #getUserDetails(userAddress: HexString) {
    const curvyHandle = await this.#apiClient.user.GetCurvyHandleByOwnerAddress(userAddress);
    if (!curvyHandle) {
      throw new Error(`No Curvy handle found for address: ${userAddress}`);
    }

    assertCurvyHandle(curvyHandle);

    const { data: userDetails } = await this.#apiClient.user.ResolveCurvyHandle(curvyHandle);
    if (!userDetails) throw new Error(`Handle ${curvyHandle} does not exist.`);

    return { ...userDetails, curvyHandle };
  }

  async #babyJubjubKeyCheck(
    existingBabyJubjubPublicKey: string | null,
    babyJubjubPublicKey: string,
    curvyHandle: CurvyHandle,
  ) {
    if (!existingBabyJubjubPublicKey) {
      const result = await this.#apiClient.user.SetBabyJubjubKey(curvyHandle, {
        babyJubjubPublicKey,
      });
      if (!("data" in result) || result.data.message !== "Saved")
        throw new Error(`Failed to set BabyJubjub key for handle ${curvyHandle}.`);
    } else {
      if (existingBabyJubjubPublicKey !== babyJubjubPublicKey) {
        throw new Error(`Wrong password for handle ${curvyHandle}.`);
      }
    }
  }

  async #preLoginChecks(keyPairs: CurvyKeyPairs, userAddress: HexString) {
    const { createdAt, publicKeys, curvyHandle } = await this.#getUserDetails(userAddress);

    if (!(publicKeys.viewingKey === keyPairs.V && publicKeys.spendingKey === keyPairs.S)) {
      throw new Error(`Wrong password for handle ${curvyHandle}.`);
    }

    await this.#updateBearerToken(keyPairs.s);

    await this.#babyJubjubKeyCheck(publicKeys.babyJubjubPublicKey, keyPairs.babyJubjubPublicKey, curvyHandle);

    return { createdAt, curvyHandle };
  }

  async #preRegistrationChecks(handle: CurvyHandle, userAddress: HexString) {
    const curvyHandle = await this.#apiClient.user.GetCurvyHandleByOwnerAddress(userAddress);
    if (curvyHandle) {
      throw new Error(`Handle ${curvyHandle} already registered, for owner address: ${userAddress}`);
    }

    if (!CURVY_HANDLE_REGEX.test(handle))
      throw new Error(
        `Invalid handle format: ${handle}. Curvy handles can only include letters, numbers, and dashes, with a minimum of 3 and maximum length of 20 characters.`,
      );

    const { data: userDetails } = await this.#apiClient.user.ResolveCurvyHandle(handle);
    if (userDetails) throw new Error(`Handle ${handle} already registered.`);

    return true;
  }

  async #createAndAddWallet(
    handle: CurvyHandle,
    userAddress: HexString,
    createdAt: string,
    keyPairs: CurvyKeyPairs,
    additionalData?: AdditionalWalletData,
  ) {
    const walletId = await generateWalletId(keyPairs.s, keyPairs.v);
    const wallet = new CurvyWallet(
      keyPairs,
      handle,
      userAddress,
      +dayjs(createdAt),
      additionalData?.password ? await computePasswordHash(additionalData.password, walletId) : undefined,
      additionalData?.credId,
    );
    await this.addWallet(wallet, true);

    return wallet;
  }

  async #registerAndAddWallet(
    { s, v }: CurvyPrivateKeys,
    handle: CurvyHandle,
    userAddress: HexString,
    additionalData?: AdditionalWalletData,
  ) {
    const keyPairs = await this.#core.getCurvyKeys(s, v);

    await this.#apiClient.user.RegisterCurvyHandle({
      handle,
      ownerAddress: userAddress,
      publicKeys: {
        viewingKey: keyPairs.V,
        spendingKey: keyPairs.S,
        babyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
      },
    });

    const { data: registerDetails } = await this.#apiClient.user.ResolveCurvyHandle(handle);
    if (!registerDetails)
      throw new Error(`Registration validation failed for handle ${handle}. Please try adding the wallet manually.`);

    await this.#updateBearerToken(keyPairs.s);

    return this.#createAndAddWallet(handle, userAddress, registerDetails.createdAt, keyPairs, additionalData);
  }

  async addPartialWallet(keyPairs: Partial<CurvyKeyPairs>) {
    const wallet = new CurvyWallet(keyPairs, null, null);
    await this.addWallet(wallet, true, true);

    return wallet;
  }

  async addWalletWithPrivateKeys(s: string, v: string, requestingAddress: HexString, credId?: ArrayBuffer) {
    const keyPairs = await this.#core.getCurvyKeys(s, v);

    const { curvyHandle, createdAt } = await this.#preLoginChecks(keyPairs, requestingAddress);

    return this.#createAndAddWallet(curvyHandle, requestingAddress, createdAt, keyPairs, { credId });
  }

  async registerWalletWithPrivateKeys(s: string, v: string, handle: CurvyHandle, userAddress: HexString) {
    await this.#preRegistrationChecks(handle, userAddress);

    return this.#registerAndAddWallet({ s, v }, handle, userAddress);
  }

  async addWalletWithSignature(
    flavour: NETWORK_FLAVOUR_VALUES,
    signature: EvmSignatureData | StarknetSignatureData,
    password: string,
  ) {
    const [r_string, s_string] = await this.#verifySignature(flavour, signature);
    const { s, v } = computePrivateKeys(r_string, s_string);
    const keyPairs = await this.#core.getCurvyKeys(s, v);

    const userAddress =
      flavour === NETWORK_FLAVOUR.STARKNET
        ? (validateAndParseAddress(signature.signingAddress) as HexString)
        : signature.signingAddress;

    const { createdAt, curvyHandle } = await this.#preLoginChecks(keyPairs, userAddress);

    return this.#createAndAddWallet(curvyHandle, userAddress, createdAt, keyPairs, { password });
  }

  async registerWalletWithSignature(
    handle: CurvyHandle,
    flavour: NETWORK_FLAVOUR_VALUES,
    signature: EvmSignatureData | StarknetSignatureData,
    password: string,
  ) {
    const userAddress =
      flavour === NETWORK_FLAVOUR.STARKNET
        ? (validateAndParseAddress(signature.signingAddress) as HexString)
        : signature.signingAddress;

    await this.#preRegistrationChecks(handle, userAddress);

    const [r_string, s_string] = await this.#verifySignature(flavour, signature);
    const { s, v } = computePrivateKeys(r_string, s_string);

    return this.#registerAndAddWallet({ s, v }, handle, userAddress, { password });
  }

  async addWalletWithPasskey(prfValue: BufferSource, credId?: ArrayBuffer) {
    const { prfAddress: userAddress, ...signature } = await processPasskeyPrf(prfValue);

    const { s, v } = computePrivateKeys(signature.r.toString(), signature.s.toString());
    const keyPairs = await this.#core.getCurvyKeys(s, v);

    const { curvyHandle, createdAt } = await this.#preLoginChecks(keyPairs, userAddress);

    return this.#createAndAddWallet(curvyHandle, userAddress, createdAt, keyPairs, { credId });
  }

  async registerWalletWithPasskey(handle: CurvyHandle, prfValue: BufferSource, credId?: ArrayBuffer) {
    const { prfAddress: userAddress, ...signature } = await processPasskeyPrf(prfValue);

    await this.#preRegistrationChecks(handle, userAddress);

    const { s, v } = computePrivateKeys(signature.r.toString(), signature.s.toString());

    return this.#registerAndAddWallet({ s, v }, handle, userAddress, { credId });
  }

  hasActiveWallet(): boolean {
    return this.#activeWallet !== null;
  }

  getWalletById(id: string) {
    return Object.freeze(this.#wallets.get(id));
  }

  hasWallet(id: string): boolean {
    return this.#wallets.has(id);
  }

  async #updateBearerToken(s: string) {
    this.#apiClient.updateBearerToken(
      await this.#apiClient.auth.GetBearerTotp().then((nonce) => {
        return this.#apiClient.auth.CreateBearerToken({ nonce, signature: signMessage(nonce, s) });
      }),
    );
  }

  async setActiveWallet(wallet: Readonly<CurvyWallet>, skipBearerTokenUpdate = false) {
    if (!this.#wallets.has(wallet.id)) {
      throw new Error(`Wallet with id ${wallet.id} does not exist.`);
    }

    this.#activeWallet = wallet;

    if (!skipBearerTokenUpdate && !wallet.isPartial) {
      await this.#updateBearerToken(wallet.keyPairs.s);
    }

    this.#startJwtRefreshInterval();
  }

  async addWallet(wallet: CurvyWallet, skipBearerTokenUpdate = false, skipScan = false) {
    this.#wallets.set(wallet.id, wallet);

    await this.setActiveWallet(wallet, skipBearerTokenUpdate);

    if (!wallet.isPartial) await this.#storage.storeCurvyWallet(wallet);

    if (!this.#scanInterval && !skipScan) {
      this.#startIntervalScan();
      return;
    }

    if (!skipScan) {
      await this.scanWallet(wallet);
    }
  }

  async removeWallet(walletId: string) {
    if (!this.#wallets.has(walletId)) {
      throw new Error(`Wallet with id ${walletId} does not exist.`);
    }

    this.#stopJwtRefreshInterval();
    this.#apiClient.updateBearerToken(undefined);
    this.#wallets.delete(walletId);

    if (this.#wallets.size > 0) {
      const wallet = this.#wallets.values().next().value;
      if (wallet) await this.setActiveWallet(wallet);
      return;
    }

    this.#activeWallet = null;
    this.#stopIntervalScan();
    return;
  }

  async scanWallet(wallet: CurvyWallet) {
    if (wallet.isPartial) {
      throw new Error("Cannot scan a partially initialized wallet!");
    }
    await this.#addressScanner.scan([wallet]);
  }

  async rescanWallets(walletIds?: Array<string>) {
    if (this.#scanInterval) {
      this.#stopIntervalScan();
    }

    const wallets = walletIds ? this.wallets.filter((wallet) => walletIds.includes(wallet.id)) : this.wallets;

    await this.#addressScanner.scan(wallets);
    this.#startIntervalScan();
  }

  /*
   * Starts an interval scan for all wallets.
   * @param interval - The interval in milliseconds to scan wallets. Default is 60 seconds.
   */
  #startIntervalScan(interval = SCAN_REFRESH_INTERVAL): void {
    this.#addressScanner.scan(this.wallets).then(() => {
      this.#scanInterval = setInterval(() => this.#addressScanner.scan(this.wallets), interval);
    });
  }

  #stopIntervalScan(): void {
    if (!this.#scanInterval) {
      return;
    }

    clearInterval(this.#scanInterval);
    this.#scanInterval = null;
  }

  #startJwtRefreshInterval(): void {
    if (!this.#jwtRefreshInterval && this.#activeWallet && !this.#activeWallet.isPartial) {
      this.#jwtRefreshInterval = setInterval(async () => {
        this.#apiClient.auth.RefreshBearerToken().then((token) => {
          this.#apiClient.updateBearerToken(token);
        });
      }, JWT_REFRESH_INTERVAL);
    }
  }

  #stopJwtRefreshInterval(): void {
    if (!this.#jwtRefreshInterval) {
      return;
    }
    clearInterval(this.#jwtRefreshInterval);
    this.#jwtRefreshInterval = null;
  }

  async getAddressPrivateKey(_address: CurvyAddress | HexString) {
    let address: CurvyAddress;

    if (isHexString(_address)) {
      address = await this.#storage.getCurvyAddress(_address);
      if (!address) {
        throw new Error(`Address ${_address} not found in storage!`);
      }
    } else address = _address;

    const wallet = this.getWalletById(address.walletId);
    if (!wallet) {
      throw new Error(`Cannot send from address ${address.address} because it's wallet is not found!`);
    }
    const { s, v } = wallet.keyPairs;

    const {
      spendingPrivKeys: [privateKey],
    } = await this.#core.scan(s, v, [address]);

    return privateKey;
  }

  getBabyJubjubPublicKey(): Promise<string> {
    return this.#core.getBabyJubjubPublicKey(this.activeWallet.keyPairs.s);
  }

  signMessageWithBabyJubjub(message: bigint): Promise<StringifyBigInts<Signature>> {
    return this.#core.signWithBabyJubjubPrivateKey(message, this.activeWallet.keyPairs.s);
  }
}

export { WalletManager };
