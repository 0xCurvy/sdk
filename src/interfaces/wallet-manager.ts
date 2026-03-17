import type { CurvyId, CurvyKeyPairs, EvmSignatureData, HexString, Signature, StringifyBigInts } from "@/types";
import type { CurvyWallet } from "@/wallet";

interface IWalletManager {
  get wallets(): Array<CurvyWallet>;
  get activeWallet(): Readonly<CurvyWallet>;

  addPartialWallet(keyPairs: Partial<CurvyKeyPairs>): Promise<CurvyWallet>;

  addWalletWithPrivateKeys(
    s: string,
    v: string,
    requestingAddress: HexString,
    credId?: ArrayBuffer,
  ): Promise<CurvyWallet>;
  registerWalletWithPrivateKeys(s: string, v: string, handle: CurvyId, ownerAddress: HexString): Promise<CurvyWallet>;

  addWalletWithPasskey(prfValue: BufferSource, credId: ArrayBuffer): Promise<CurvyWallet>;
  registerWalletWithPasskey(handle: CurvyId, prfValue: BufferSource, credId: ArrayBuffer): Promise<CurvyWallet>;

  addWalletWithSignature(signature: EvmSignatureData): Promise<CurvyWallet>;
  registerWalletWithSignature(handle: CurvyId, signature: EvmSignatureData): Promise<CurvyWallet>;

  hasWallet(id: string): boolean;
  hasActiveWallet(): boolean;
  setActiveWallet(wallet: CurvyWallet): Promise<void>;

  getWalletById(id: string): Readonly<CurvyWallet | undefined>;

  addWallet(wallet: CurvyWallet, skipBearerTokenUpdate?: boolean): Promise<void>;
  removeWallet(walletId: string): Promise<void>;

  getBabyJubjubPublicKey(): Promise<string>;
  signMessageWithBabyJubjub(message: bigint): Promise<StringifyBigInts<Signature>>;
}

export type { IWalletManager };
