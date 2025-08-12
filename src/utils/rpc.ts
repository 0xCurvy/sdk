import type { Network } from "@/types/api";
import type { BigNumberish } from "starknet";
import { defineChain } from "viem";

const generateViemChainFromNetwork = (network: Network) => {
  const nativeCurrency = network.currencies.find((c) => c.native);

  if (!nativeCurrency) {
    throw new Error(`No native currency found for network: ${network.name}`);
  }

  const { name, symbol, decimals } = nativeCurrency;

  return defineChain({
    id: Number(network.chainId),
    name: network.name,
    rpcUrls: {
      default: {
        http: [network.rpcUrl],
      },
    },
    nativeCurrency: {
      name,
      symbol,
      decimals,
    },
  });
};

const fromUint256 = (l: BigNumberish, h: BigNumberish): bigint => {
  const low = BigInt(l);
  const high = BigInt(h);

  const bhigh = high << 128n;
  return low + bhigh;
};

export { generateViemChainFromNetwork, fromUint256 };
