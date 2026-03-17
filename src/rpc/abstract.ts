import type { Network } from "@/types/api";
import type { HexString } from "@/types/helper";
import type { RpcBalance, RpcBalances } from "@/types/rpc";

abstract class Rpc {
  readonly #network: Network;

  protected constructor(network: Network) {
    this.#network = network;
  }

  get network(): Network {
    return this.#network;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Different networks have different provider types
  abstract get provider(): any;

  abstract getBalances(stealthAddress: HexString): Promise<RpcBalances>;

  abstract getBalance(stealthAddress: HexString, symbol: string): Promise<RpcBalance>;
}

export { Rpc };
