import type { NETWORK_FLAVOUR, NETWORK_FLAVOUR_VALUES } from "@/constants/networks";
import type {
  CurvyAddress,
  CurvyHandle,
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

  addWalletWithSignature(flavour: NETWORK_FLAVOUR["EVM"], signature: EvmSignatureData): Promise<CurvyWallet>;
  addWalletWithSignature(flavour: NETWORK_FLAVOUR["STARKNET"], signature: StarknetSignatureData): Promise<CurvyWallet>;
  addWalletWithSignature(
    flavour: NETWORK_FLAVOUR_VALUES,
    signature: EvmSignatureData | StarknetSignatureData,
  ): Promise<CurvyWallet>;

  registerWalletWithSignature(
    handle: CurvyHandle,
    flavour: NETWORK_FLAVOUR["EVM"],
    signature: EvmSignatureData,
  ): Promise<CurvyWallet>;
  registerWalletWithSignature(
    handle: CurvyHandle,
    flavour: NETWORK_FLAVOUR["STARKNET"],
    signature: StarknetSignatureData,
  ): Promise<CurvyWallet>;
  registerWalletWithSignature(
    handle: CurvyHandle,
    flavour: NETWORK_FLAVOUR_VALUES,
    signature: EvmSignatureData | StarknetSignatureData,
  ): Promise<CurvyWallet>;

  hasWallet(id: string): boolean;
  hasActiveWallet(): boolean;
  setActiveWallet(wallet: CurvyWallet): Promise<void>;

  getWalletById(id: string): Readonly<CurvyWallet | undefined>;

  addWallet(wallet: CurvyWallet): Promise<void>;
  removeWallet(walletId: string): Promise<void>;

  scanWallet(wallet: CurvyWallet): Promise<void>;
  rescanWallets(walletIds?: Array<string>): Promise<void>;

  getAddressPrivateKey(address: CurvyAddress | HexString): Promise<HexString>;

  signMessageWithBabyJubjub(message: bigint): StringifyBigInts<Signature>;
}

export type { IWalletManager };
