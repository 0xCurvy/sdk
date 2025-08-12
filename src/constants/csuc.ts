import { type NETWORKS, SUPPORTED_NETWORKS } from "@/constants/networks";
import type { HexString } from "@/types/helper";

const CSUC_DEPLOYMENT_ADDRESSES: Partial<Record<NETWORKS, HexString>> = {
  [SUPPORTED_NETWORKS.ETHEREUM_SEPOLIA]: "0x1b6771B255912546b89a244136674269F008e223",
} as const;

const NATIVE_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000001";

const CSUC_TOKENS: Partial<Record<NETWORKS, Array<{ address: HexString; symbol: string; decimals: number }>>> = {
  [SUPPORTED_NETWORKS.ETHEREUM_SEPOLIA]: [
    { address: NATIVE_TOKEN_ADDRESS, symbol: "ETH", decimals: 18 },
    {
      symbol: "USDC",
      address: "0x65aFADD39029741B3b8f0756952C74678c9cEC93",
      decimals: 6,
    },
    {
      address: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
      symbol: "LINK",
      decimals: 18,
    },
  ],
};

export { NATIVE_TOKEN_ADDRESS, CSUC_TOKENS, CSUC_DEPLOYMENT_ADDRESSES };
