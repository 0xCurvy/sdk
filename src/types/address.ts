import {
  type EVM_NETWORKS,
  NETWORK_FLAVOUR,
  type NETWORK_FLAVOUR_VALUES,
  type NETWORK_GROUP_VALUES,
  type NETWORKS,
  type STARKNET_NETWORKS,
  type TOKENS,
} from "@/constants/networks";
import type { RawAnnouncement } from "@/types/api";
import type { HexString } from "@/types/helper";

type ScannedAnnouncement = RawAnnouncement & {
  publicKey: string;
  walletId: string;
  address: string;
};

type AnnouncementBase = {
  ephemeralPublicKey: string;
  viewTag: string;
  recipientStealthPublicKey: string;
};

type CurvyAddressTokenMetadata = {
  decimals: number;
  iconUrl: string;
  name: string;
  symbol: string;
  native?: boolean;
};

type CurvyAddressNetworkMetadata = {
  testnet: boolean;
  flavour: NETWORK_FLAVOUR_VALUES;
  group: NETWORK_GROUP_VALUES;
  slug: NETWORKS;
};

type CurvyAddressBalance = {
  balance: bigint;
  tokenAddress: HexString | undefined;
  tokenMeta: CurvyAddressTokenMetadata;
  networkMeta: CurvyAddressNetworkMetadata;
};
// biome-ignore lint/suspicious/noExplicitAny: Need to allow any for generic type
type CurvyAddressBalances<T extends NETWORK_FLAVOUR_VALUES = any> = Partial<
  Record<
    T extends NETWORK_FLAVOUR["EVM"]
      ? EVM_NETWORKS
      : T extends NETWORK_FLAVOUR["STARKNET"]
        ? STARKNET_NETWORKS
        : string,
    Partial<Record<TOKENS, CurvyAddressBalance>>
  >
>;

// biome-ignore lint/suspicious/noExplicitAny: Need to allow any for generic type
type CurvyAddressCsucNonces<T extends NETWORK_FLAVOUR_VALUES = any> = Partial<
  Record<
    T extends NETWORK_FLAVOUR["EVM"]
      ? EVM_NETWORKS
      : T extends NETWORK_FLAVOUR["STARKNET"]
        ? STARKNET_NETWORKS
        : string,
    Partial<Record<TOKENS, bigint>>
  >
>;

// biome-ignore lint/suspicious/noExplicitAny: Need to allow any for generic type
interface CurvyAddress<T extends NETWORK_FLAVOUR_VALUES = any> extends ScannedAnnouncement {
  walletId: string;
  balances: CurvyAddressBalances<T>;
  csuc: {
    balances: CurvyAddressBalances<T>;
    nonces: CurvyAddressCsucNonces<T>;
  };
}
interface EVMCurvyAddress extends CurvyAddress<NETWORK_FLAVOUR["EVM"]> {}
const isEvmCurvyAddress = (address: CurvyAddress): address is EVMCurvyAddress => {
  return address.networkFlavour === NETWORK_FLAVOUR.EVM;
};
function assertEvmCurvyAddress(address: CurvyAddress): asserts address is EVMCurvyAddress {
  if (!isEvmCurvyAddress(address)) {
    throw new Error("Address is not an EVM Curvy Address");
  }
}
interface StarknetCurvyAddress extends CurvyAddress<NETWORK_FLAVOUR["STARKNET"]> {}
const isStarknetCurvyAddress = (address: CurvyAddress): address is StarknetCurvyAddress => {
  return address.networkFlavour === NETWORK_FLAVOUR.STARKNET;
};
function assertStarknetCurvyAddress(address: CurvyAddress): asserts address is StarknetCurvyAddress {
  if (!isStarknetCurvyAddress(address)) {
    throw new Error("Address is not a Starknet Curvy Address");
  }
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
interface MinifiedCurvyAddress<T extends NETWORK_FLAVOUR_VALUES = any>
  extends Omit<CurvyAddress<T>, "ephemeralPublicKey" | "publicKey"> {
  ephemeralPublicKey: Uint8Array;
  publicKey: Uint8Array;
}

export { isEvmCurvyAddress, isStarknetCurvyAddress, assertEvmCurvyAddress, assertStarknetCurvyAddress };

export type {
  AnnouncementBase,
  ScannedAnnouncement,
  CurvyAddress,
  CurvyAddressBalances,
  CurvyAddressCsucNonces,
  CurvyAddressBalance,
  CurvyAddressTokenMetadata,
  CurvyAddressNetworkMetadata,
  MinifiedCurvyAddress,
  EVMCurvyAddress,
  StarknetCurvyAddress,
};
