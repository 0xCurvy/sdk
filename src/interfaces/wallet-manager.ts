import type { NETWORK_FLAVOUR, NETWORK_FLAVOUR_VALUES } from "@/constants/networks";
import type {
  CurvyAddress,
  CurvyHandle,
  CurvyKeyPairs,
  EvmSignatureData,
  HexString,
  Signature,
  StarknetSignatureData,
  StringifyBigInts,
} from "@/types";
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
  registerWalletWithPrivateKeys(
    s: string,
    v: string,
    handle: CurvyHandle,
    ownerAddress: HexString,
  ): Promise<CurvyWallet>;

  addWalletWithPasskey(prfValue: BufferSource, credId: ArrayBuffer): Promise<CurvyWallet>;
  registerWalletWithPasskey(handle: CurvyHandle, prfValue: BufferSource, credId: ArrayBuffer): Promise<CurvyWallet>;

  addWalletWithSignature(
    flavour: NETWORK_FLAVOUR["EVM"],
    signature: EvmSignatureData,
    password: string,
  ): Promise<CurvyWallet>;
  addWalletWithSignature(
    flavour: NETWORK_FLAVOUR["STARKNET"],
    signature: StarknetSignatureData,
    password: string,
  ): Promise<CurvyWallet>;
  addWalletWithSignature(
    flavour: NETWORK_FLAVOUR_VALUES,
    signature: EvmSignatureData | StarknetSignatureData,
    password: string,
  ): Promise<CurvyWallet>;

  registerWalletWithSignature(
    handle: CurvyHandle,
    flavour: NETWORK_FLAVOUR["EVM"],
    signature: EvmSignatureData,
    password: string,
  ): Promise<CurvyWallet>;
  registerWalletWithSignature(
    handle: CurvyHandle,
    flavour: NETWORK_FLAVOUR["STARKNET"],
    signature: StarknetSignatureData,
    password: string,
  ): Promise<CurvyWallet>;
  registerWalletWithSignature(
    handle: CurvyHandle,
    flavour: NETWORK_FLAVOUR_VALUES,
    signature: EvmSignatureData | StarknetSignatureData,
    password: string,
  ): Promise<CurvyWallet>;

  hasWallet(id: string): boolean;
  hasActiveWallet(): boolean;
  setActiveWallet(wallet: CurvyWallet): Promise<void>;

  getWalletById(id: string): Readonly<CurvyWallet | undefined>;

  addWallet(wallet: CurvyWallet, skipBearerTokenUpdate?: boolean, skipScan?: boolean): Promise<void>;
  removeWallet(walletId: string): Promise<void>;

  scanWallet(wallet: CurvyWallet): Promise<void>;
  rescanWallets(walletIds?: Array<string>): Promise<void>;

  getAddressPrivateKey(address: CurvyAddress | HexString): Promise<HexString>;

  getBabyJubjubPublicKey(): Promise<string>;
  signMessageWithBabyJubjub(message: bigint): Promise<StringifyBigInts<Signature>>;
}

export type { IWalletManager };
