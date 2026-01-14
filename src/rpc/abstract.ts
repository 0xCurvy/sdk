import type { SignTransactionRequest } from "viem/_types/actions/wallet/signTransaction";
import type { CurvyAddress } from "@/types/address";
import type { Network } from "@/types/api";
import type { HexString } from "@/types/helper";
import type { RpcBalance, RpcBalances, RpcCallReturnType, StarknetFeeEstimate, VaultBalance } from "@/types/rpc";

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

  abstract sendToAddress(
    _curvyAddress: CurvyAddress,
    privateKey: HexString,
    address: string,
    amount: bigint,
    currencyAddress: string,
    fee?: StarknetFeeEstimate | bigint,
  ): Promise<RpcCallReturnType>;

  abstract estimateTransactionFee(
    _curvyAddress: CurvyAddress,
    privateKey: HexString,
    address: string,
    amount: bigint,
    currencyAddress: string,
  ): Promise<bigint | StarknetFeeEstimate>;

  abstract feeToAmount(feeEstimate: StarknetFeeEstimate | bigint): bigint;

  abstract getVaultBalances(address: HexString): Promise<VaultBalance>;

  abstract estimateOnboardNativeToVault(
    from: HexString,
    amount: bigint,
  ): Promise<{ maxFeePerGas: bigint; gasLimit: bigint }>;
  abstract onboardNativeToVault(
    amount: bigint,
    privateKey: HexString,
    maxFeePerGas: bigint,
    gasLimit: bigint,
  ): Promise<RpcCallReturnType>;

  abstract signRawTransaction(privateKey: HexString, txRequest: SignTransactionRequest): Promise<string>;
  abstract signMessage(privateKey: HexString, typedData: any): Promise<string>;
}

export { Rpc };
