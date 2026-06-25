import type { Network } from "@/types/api";
import type { RpcBalance, RpcBalances } from "./types";

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

  /**
   * Stealth address format depends on the network flavour:
   *   - EVM: `0x`-prefixed 20-byte hex
   *   - Solana: 32-byte base58
   * The string union keeps both supported under a single signature.
   */
  abstract getBalances(stealthAddress: string): Promise<RpcBalances>;

  abstract getBalance(stealthAddress: string, symbol: string): Promise<RpcBalance>;
}

export { Rpc };
