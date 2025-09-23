import type { CurvyAddress } from "@/types/address";
import type { Currency, Network } from "@/types/api";
import type { GasSponsorshipRequest } from "@/types/gas-sponsorship";
import type { HexString } from "@/types/helper";
import type { Erc1155Balance, RpcBalance, RpcBalances, SendReturnType, StarknetFeeEstimate } from "@/types/rpc";

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

  abstract getBalances(stealthAddress: CurvyAddress): Promise<RpcBalances>;

  abstract getBalance(stealthAddress: CurvyAddress, symbol: string): Promise<RpcBalance>;

  abstract sendToAddress(
    _curvyAddress: CurvyAddress,
    privateKey: HexString,
    address: string,
    amount: string,
    currency: string,
    fee?: StarknetFeeEstimate | bigint,
  ): Promise<SendReturnType>;

  abstract estimateFee(
    _curvyAddress: CurvyAddress,
    privateKey: HexString,
    address: string,
    amount: string,
    currency: string,
  ): Promise<bigint | StarknetFeeEstimate>;

  abstract feeToAmount(feeEstimate: StarknetFeeEstimate | bigint): bigint;

  abstract injectErc1155Ids(currencies: Currency[]): Promise<Currency[]>;
  abstract getErc1155Balances(address: CurvyAddress): Promise<Erc1155Balance>;

  abstract prepareCSUCOnboardTransaction(
    privateKey: HexString,
    toAddress: HexString,
    currency: Currency,
    amount: string,
  ): Promise<GasSponsorshipRequest>;
}

export { Rpc };
