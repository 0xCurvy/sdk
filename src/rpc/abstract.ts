import type { CurvyAddress, CurvyAddressBalance, CurvyAddressBalances } from "@/types/address";
import type { Network } from "@/types/api";
import type { HexString } from "@/types/helper";
import type { StarknetFeeEstimate } from "@/types/rpc";
import type { GasSponsorshipRequest } from "@/types/gas-sponsorship";

abstract class Rpc {
  readonly #network: Network;

  protected constructor(network: Network) {
    this.#network = network;
  }

  get network(): Network {
    return this.#network;
  }

  abstract getBalances(stealthAddress: CurvyAddress): Promise<CurvyAddressBalances>;

  abstract getBalance(stealthAddress: CurvyAddress, symbol: string): Promise<CurvyAddressBalance>;

  abstract sendToAddress(
    _curvyAddress: CurvyAddress,
    privateKey: HexString,
    address: string,
    amount: string,
    currency: string,
    fee?: StarknetFeeEstimate | bigint,
  ): Promise<string>;

  abstract estimateFee(
    _curvyAddress: CurvyAddress,
    privateKey: HexString,
    address: string,
    amount: string,
    currency: string,
  ): Promise<bigint | StarknetFeeEstimate>;

  abstract feeToAmount(feeEstimate: StarknetFeeEstimate | bigint): bigint;

  abstract prepareCSUCOnboardTransactions(
    privateKey: HexString,
    toAddress: string,
    currency: string,
    amount: bigint | string,
  ): Promise<GasSponsorshipRequest>;
}

export { Rpc };
