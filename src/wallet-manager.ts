import dayjs from "dayjs";
import { parseSignature, verifyTypedData } from "viem";
import { JWT_REFRESH_INTERVAL } from "@/constants/intervals";
import { CURVY_ID_REGEX } from "@/constants/regex";
import type { IApiClient } from "@/interfaces/api";
import type { ICore } from "@/interfaces/core";
import type { StorageInterface } from "@/interfaces/storage";
import type { IWalletManager } from "@/interfaces/wallet-manager";
import {
  type AdditionalWalletData,
  assertCurvyId,
  type CurvyId,
  type CurvyKeyPairs,
  type CurvyPrivateKeys,
  type EvmSignatureData,
  type EvmSignTypedDataParameters,
  type HexString,
  isHexString,
  type Signature,
  type StarknetSignatureData,
  type StringifyBigInts,
} from "@/types";
import { computePrivateKeys } from "@/utils/address";
import { computePasswordHash, signMessage } from "@/utils/encryption";
import { generateWalletId } from "@/utils/helpers";
import { processPasskeyPrf } from "@/utils/passkeys";
import { CurvyWallet } from "@/wallet";

class WalletManager implements IWalletManager {
  readonly #apiClient: IApiClient;
  readonly #storage: StorageInterface;
  readonly #core: ICore;
  readonly #wallets: Map<string, CurvyWallet>;

  #jwtRefreshInterval: NodeJS.Timeout | null;
  #activeWallet: Readonly<CurvyWallet> | null;

  constructor(client: IApiClient, storage: StorageInterface, core: ICore) {
    this.#apiClient = client;
    this.#wallets = new Map<string, CurvyWallet>();
    this.#storage = storage;
    this.#core = core;

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

  async #verifySignature({
    signatureParams,
    signingAddress,
    signatureResult,
  }: EvmSignatureData): Promise<[r: string, s: string]> {
    if (!isHexString(signatureResult)) {
      throw new Error("Invalid signature result");
    }

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

  async #getUserDetails(userAddress: HexString) {
    const curvyHandle = await this.#apiClient.user.GetCurvyIdByOwnerAddress(userAddress);
    if (!curvyHandle) {
      throw new Error(`No Curvy handle found for address: ${userAddress}`);
    }

    assertCurvyId(curvyHandle);

    const { data: userDetails } = await this.#apiClient.user.ResolveCurvyId(curvyHandle);
    if (!userDetails) throw new Error(`Handle ${curvyHandle} does not exist.`);

    return { ...userDetails, curvyHandle };
  }

  async #babyJubjubKeyCheck(
    existingBabyJubjubPublicKey: string | null,
    babyJubjubPublicKey: string,
    curvyHandle: CurvyId,
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

  async #preRegistrationChecks(handle: CurvyId, userAddress: HexString) {
    const curvyHandle = await this.#apiClient.user.GetCurvyIdByOwnerAddress(userAddress);
    if (curvyHandle) {
      throw new Error(`Handle ${curvyHandle} already registered, for owner address: ${userAddress}`);
    }

    if (!CURVY_ID_REGEX.test(handle))
      throw new Error(
        `Invalid handle format: ${handle}. Curvy handles can only include letters, numbers, and dashes, with a minimum of 3 and maximum length of 20 characters.`,
      );

    const { data: userDetails } = await this.#apiClient.user.ResolveCurvyId(handle);
    if (userDetails) throw new Error(`Handle ${handle} already registered.`);

    return true;
  }

  async #createAndAddWallet(
    handle: CurvyId,
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
    handle: CurvyId,
    userAddress: HexString,
    additionalData?: AdditionalWalletData,
  ) {
    const keyPairs = await this.#core.getCurvyKeys(s, v);

    await this.#apiClient.user.RegisterCurvyId({
      handle,
      ownerAddress: userAddress,
      publicKeys: {
        viewingKey: keyPairs.V,
        spendingKey: keyPairs.S,
        babyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
      },
    });

    const { data: registerDetails } = await this.#apiClient.user.ResolveCurvyId(handle);
    if (!registerDetails)
      throw new Error(`Registration validation failed for handle ${handle}. Please try adding the wallet manually.`);

    await this.#updateBearerToken(keyPairs.s);

    return this.#createAndAddWallet(handle, userAddress, registerDetails.createdAt, keyPairs, additionalData);
  }

  async addPartialWallet(keyPairs: Partial<CurvyKeyPairs>) {
    const wallet = new CurvyWallet(keyPairs, null, null);
    await this.addWallet(wallet, true);

    return wallet;
  }

  async addWalletWithPrivateKeys(s: string, v: string, requestingAddress: HexString, credId?: ArrayBuffer) {
    const keyPairs = await this.#core.getCurvyKeys(s, v);

    const { curvyHandle, createdAt } = await this.#preLoginChecks(keyPairs, requestingAddress);

    return this.#createAndAddWallet(curvyHandle, requestingAddress, createdAt, keyPairs, { credId });
  }

  async registerWalletWithPrivateKeys(s: string, v: string, handle: CurvyId, userAddress: HexString) {
    await this.#preRegistrationChecks(handle, userAddress);

    return this.#registerAndAddWallet({ s, v }, handle, userAddress);
  }

  async addWalletWithSignature(signature: EvmSignatureData | StarknetSignatureData) {
    const [r_string, s_string] = await this.#verifySignature(signature);
    const { s, v } = computePrivateKeys(r_string, s_string);
    const keyPairs = await this.#core.getCurvyKeys(s, v);

    const userAddress = signature.signingAddress;

    const { createdAt, curvyHandle } = await this.#preLoginChecks(keyPairs, userAddress);

    return this.#createAndAddWallet(curvyHandle, userAddress, createdAt, keyPairs);
  }

  async registerWalletWithSignature(handle: CurvyId, signature: EvmSignatureData) {
    const userAddress = signature.signingAddress;

    await this.#preRegistrationChecks(handle, userAddress);

    const [r_string, s_string] = await this.#verifySignature(signature);
    const { s, v } = computePrivateKeys(r_string, s_string);

    return this.#registerAndAddWallet({ s, v }, handle, userAddress);
  }

  async addWalletWithPasskey(prfValue: BufferSource, credId?: ArrayBuffer) {
    const { prfAddress: userAddress, ...signature } = await processPasskeyPrf(prfValue);

    const { s, v } = computePrivateKeys(signature.r.toString(), signature.s.toString());
    const keyPairs = await this.#core.getCurvyKeys(s, v);

    const { curvyHandle, createdAt } = await this.#preLoginChecks(keyPairs, userAddress);

    return this.#createAndAddWallet(curvyHandle, userAddress, createdAt, keyPairs, { credId });
  }

  async registerWalletWithPasskey(handle: CurvyId, prfValue: BufferSource, credId?: ArrayBuffer) {
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

  async addWallet(wallet: CurvyWallet, skipBearerTokenUpdate = false) {
    this.#wallets.set(wallet.id, wallet);

    await this.setActiveWallet(wallet, skipBearerTokenUpdate);

    if (!wallet.isPartial) await this.#storage.insertCurvyWallet(wallet);
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
    return;
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

  getBabyJubjubPublicKey(): Promise<string> {
    return this.#core.getBabyJubjubPublicKey(this.activeWallet.keyPairs.s);
  }

  signMessageWithBabyJubjub(message: bigint): Promise<StringifyBigInts<Signature>> {
    return this.#core.signWithBabyJubjubPrivateKey(message, this.activeWallet.keyPairs.s);
  }
}

export { WalletManager };
