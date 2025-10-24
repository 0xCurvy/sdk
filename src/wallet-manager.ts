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
  type CurvyPublicKeys,
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
const SCAN_REFRESH_INTERVAL = 60 * 10 ** 3;

class WalletManager implements IWalletManager {
  readonly #apiClient: IApiClient;
  readonly #rpcClient: MultiRpc;
  readonly #storage: StorageInterface;
  readonly #core: ICore;
  readonly #wallets: Map<string, CurvyWallet>;
  readonly #addressScanner: IAddressScanner;

  #scanInterval: NodeJS.Timeout | null;
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
    this.#activeWallet = null;
  }

  get activeWallet() {
    if (!this.#activeWallet) {
      throw new Error("No active wallet set.");
    }
    return Object.freeze(this.#activeWallet);
  }

  get wallets() {
    return Array.from(this.#wallets.values());
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

  async #preLoginChecks({ V, S, babyJubjubPublicKey }: CurvyPublicKeys, ownerAddress: HexString) {
    const curvyHandle = await this.#apiClient.user.GetCurvyHandleByOwnerAddress(ownerAddress);
    if (!curvyHandle) {
      throw new Error(`No Curvy handle found for owner address: ${ownerAddress}`);
    }

    assertCurvyHandle(curvyHandle);

    const { data: ownerDetails } = await this.#apiClient.user.ResolveCurvyHandle(curvyHandle);
    if (!ownerDetails) throw new Error(`Handle ${curvyHandle} does not exist.`);

    const { createdAt, publicKeys } = ownerDetails;

    if (!publicKeys.babyJubjubPublicKey) {
      const result = await this.#apiClient.user.SetBabyJubjubKey(curvyHandle, {
        babyJubjubPublicKey: babyJubjubPublicKey,
      });
      if (!("data" in result) || result.data.message !== "Saved")
        throw new Error(`Failed to set BabyJubjub key for handle ${curvyHandle}.`);
    }

    if (
      !(publicKeys.viewingKey === V && publicKeys.spendingKey === S) ||
      (publicKeys.babyJubjubPublicKey && publicKeys.babyJubjubPublicKey !== babyJubjubPublicKey)
    ) {
      throw new Error(`Wrong password for handle ${curvyHandle}.`);
    }

    return { createdAt, curvyHandle };
  }

  async #preRegistrationChecks(handle: CurvyHandle, ownerAddress: HexString) {
    const curvyHandle = await this.#apiClient.user.GetCurvyHandleByOwnerAddress(ownerAddress);
    if (curvyHandle) {
      throw new Error(`Handle ${curvyHandle} already registered, for owner address: ${ownerAddress}`);
    }

    if (!CURVY_HANDLE_REGEX.test(handle))
      throw new Error(
        `Invalid handle format: ${handle}. Curvy handles can only include letters, numbers, and dashes, with a minimum of 3 and maximum length of 20 characters.`,
      );

    const { data: ownerDetails } = await this.#apiClient.user.ResolveCurvyHandle(handle);
    if (ownerDetails) throw new Error(`Handle ${handle} already registered.`);

    return true;
  }

  async #createAndAddWallet(
    handle: CurvyHandle,
    ownerAddress: HexString,
    createdAt: string,
    keyPairs: CurvyKeyPairs,
    additionalData?: AdditionalWalletData,
  ) {
    await this.#updateBearerToken(keyPairs.s);

    const walletId = await generateWalletId(keyPairs.s, keyPairs.v);
    const wallet = new CurvyWallet(
      walletId,
      +dayjs(createdAt),
      handle,
      ownerAddress,
      keyPairs,
      additionalData?.password ? await computePasswordHash(additionalData.password, walletId) : undefined,
      additionalData?.credId,
    );
    await this.addWallet(wallet, true);

    return wallet;
  }

  async #registerAndAddWallet(
    { s, v }: CurvyPrivateKeys,
    handle: CurvyHandle,
    ownerAddress: HexString,
    additionalData?: AdditionalWalletData,
  ) {
    const keyPairs = this.#core.getCurvyKeys(s, v);

    await this.#apiClient.user.RegisterCurvyHandle({
      handle,
      ownerAddress,
      publicKeys: {
        viewingKey: keyPairs.V,
        spendingKey: keyPairs.S,
        babyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
      },
    });

    const { data: registerDetails } = await this.#apiClient.user.ResolveCurvyHandle(handle);
    if (!registerDetails)
      throw new Error(`Registration validation failed for handle ${handle}. Please try adding the wallet manually.`);

    return this.#createAndAddWallet(handle, ownerAddress, registerDetails.createdAt, keyPairs, additionalData);
  }

  async addWalletWithPrivateKeys(s: string, v: string, requestingAddress: HexString, credId?: ArrayBuffer) {
    const keyPairs = this.#core.getCurvyKeys(s, v);

    const { curvyHandle, createdAt } = await this.#preLoginChecks(
      { V: keyPairs.V, S: keyPairs.S, babyJubjubPublicKey: keyPairs.babyJubjubPublicKey },
      requestingAddress,
    );

    return this.#createAndAddWallet(curvyHandle, requestingAddress, createdAt, keyPairs, { credId });
  }

  async registerWalletWithPrivateKeys(s: string, v: string, handle: CurvyHandle, ownerAddress: HexString) {
    await this.#preRegistrationChecks(handle, ownerAddress);

    return this.#registerAndAddWallet({ s, v }, handle, ownerAddress);
  }

  async addWalletWithSignature(
    flavour: NETWORK_FLAVOUR_VALUES,
    signature: EvmSignatureData | StarknetSignatureData,
    password: string,
  ) {
    const [r_string, s_string] = await this.#verifySignature(flavour, signature);
    const { s, v } = computePrivateKeys(r_string, s_string);
    const keyPairs = this.#core.getCurvyKeys(s, v);

    const ownerAddress =
      flavour === NETWORK_FLAVOUR.STARKNET
        ? (validateAndParseAddress(signature.signingAddress) as HexString)
        : signature.signingAddress;

    const { createdAt, curvyHandle } = await this.#preLoginChecks(
      { V: keyPairs.V, S: keyPairs.S, babyJubjubPublicKey: keyPairs.babyJubjubPublicKey },
      ownerAddress,
    );

    return this.#createAndAddWallet(curvyHandle, ownerAddress, createdAt, keyPairs, { password });
  }

  async registerWalletWithSignature(
    handle: CurvyHandle,
    flavour: NETWORK_FLAVOUR_VALUES,
    signature: EvmSignatureData | StarknetSignatureData,
    password: string,
  ) {
    const ownerAddress =
      flavour === NETWORK_FLAVOUR.STARKNET
        ? (validateAndParseAddress(signature.signingAddress) as HexString)
        : signature.signingAddress;

    await this.#preRegistrationChecks(handle, ownerAddress);

    const [r_string, s_string] = await this.#verifySignature(flavour, signature);
    const { s, v } = computePrivateKeys(r_string, s_string);

    return this.#registerAndAddWallet({ s, v }, handle, ownerAddress, { password });
  }

  async addWalletWithPasskey(prfValue: BufferSource, credId?: ArrayBuffer) {
    const { prfAddress: ownerAddress, ...signature } = await processPasskeyPrf(prfValue);

    const { s, v } = computePrivateKeys(signature.r.toString(), signature.s.toString());
    const keyPairs = this.#core.getCurvyKeys(s, v);

    const { curvyHandle, createdAt } = await this.#preLoginChecks(
      { V: keyPairs.V, S: keyPairs.S, babyJubjubPublicKey: keyPairs.babyJubjubPublicKey },
      ownerAddress,
    );

    return this.#createAndAddWallet(curvyHandle, ownerAddress, createdAt, keyPairs, { credId });
  }

  async registerWalletWithPasskey(handle: CurvyHandle, prfValue: BufferSource, credId?: ArrayBuffer) {
    const { prfAddress: ownerAddress, ...signature } = await processPasskeyPrf(prfValue);

    await this.#preRegistrationChecks(handle, ownerAddress);

    const { s, v } = computePrivateKeys(signature.r.toString(), signature.s.toString());

    return this.#registerAndAddWallet({ s, v }, handle, ownerAddress, { credId });
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

    if (!skipBearerTokenUpdate) {
      await this.#updateBearerToken(wallet.keyPairs.s);
    }

    setInterval(
      () =>
        this.#apiClient.auth.RefreshBearerToken().then((token) => {
          this.#apiClient.updateBearerToken(token);
        }),
      JWT_REFRESH_INTERVAL,
    );
  }

  async addWallet(wallet: CurvyWallet, skipBearerTokenUpdate = false, skipScan = false) {
    this.#wallets.set(wallet.id, wallet);

    await this.setActiveWallet(wallet, skipBearerTokenUpdate);

    await this.#storage.storeCurvyWallet(wallet);

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
    await this.#addressScanner.scan([wallet]);
  }

  /*
    TODO
        Should we allow scanning of all wallets at once, or should we only scan the active wallet?
        If we allow scanning of all wallets, we should consider how we approach request auth verification,
        as currently the bearer token is set to the active wallet's token.
  */
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

  async getAddressPrivateKey(_address: CurvyAddress | HexString) {
    let address: CurvyAddress;

    if (isHexString(_address)) {
      address = await this.#storage.getCurvyAddress(_address);
    } else address = _address;

    const wallet = this.getWalletById(address.walletId);
    if (!wallet) {
      throw new Error(`Cannot send from address ${address.address} because it's wallet is not found!`);
    }
    const { s, v } = wallet.keyPairs;

    const {
      spendingPrivKeys: [privateKey],
    } = this.#core.scan(s, v, [address]);

    return privateKey;
  }

  signMessageWithBabyJubjub(message: bigint): StringifyBigInts<Signature> {
    return this.#core.signWithBabyJubjubPrivateKey(message, this.activeWallet.keyPairs.s);
  }
}

export { WalletManager };
