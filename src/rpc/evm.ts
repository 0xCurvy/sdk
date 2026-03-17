import { type Address, createPublicClient, createWalletClient, erc20Abi, http } from "viem";
import { getBalance, readContract } from "viem/actions";
import { NETWORK_ENVIRONMENT } from "@/constants/networks";
import { evmMulticall3Abi } from "@/contracts/evm/abi/multicall3";
import { Rpc } from "@/rpc/abstract";
import type { RpcBalance, RpcBalances } from "@/types";
import type { Currency, Network } from "@/types/api";
import type { HexString } from "@/types/helper";
import { toSlug } from "@/utils/helpers";
import {
  type CurvyPublicClient,
  type CurvyWalletClient,
  extendClientFromNetwork,
  generateViemChainFromNetwork,
} from "@/utils/rpc";

type MulticallResult =
  | {
      error: Error;
      result?: undefined;
      status: "failure";
    }
  | {
      error?: undefined;
      result: bigint;
      status: "success";
    };

class EvmRpc extends Rpc {
  readonly #publicClient: CurvyPublicClient;
  readonly #walletClient: CurvyWalletClient;

  constructor(network: Network) {
    super(network);

    const chain = generateViemChainFromNetwork(network);

    this.#publicClient = createPublicClient({
      transport: http(this.network.rpcUrl),
      name: `CurvyEvmPublicClient-${toSlug(network.name)}`,
      chain,
    }).extend((client) => extendClientFromNetwork(network, client));

    this.#walletClient = createWalletClient({
      transport: http(this.network.rpcUrl),
      name: `CurvyEvmWalletClient-${toSlug(network.name)}`,
      chain,
    }).extend((client) => extendClientFromNetwork(network, client));
  }

  get provider() {
    return this.#publicClient;
  }

  get walletClient() {
    return this.#walletClient;
  }

  async getBalances(address: HexString): Promise<RpcBalances> {
    const calls = this.network.currencies.map((currency: Currency) => {
      if (currency.nativeCurrency) {
        return {
          address: this.network.multiCallContractAddress as Address,
          abi: evmMulticall3Abi,
          functionName: "getEthBalance",
          args: [address as Address],
        };
      }

      return {
        address: currency.contractAddress as Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address as Address],
      };
    });

    const tokenBalances = (await this.#publicClient.multicall({
      contracts: calls,
      allowFailure: true,
    })) as MulticallResult[];

    const networkSlug = toSlug(this.network.name);

    return tokenBalances.reduce<RpcBalances>((acc, tokenBalance, idx) => {
      const currency = this.network.currencies[idx];
      if (tokenBalance.status === "failure") {
        console.log(`Couldn't get balance for token ${currency.contractAddress}: `, tokenBalance.error);
        return acc;
      }

      const rpcBalance: RpcBalance = {
        id: currency.id,
        balance: tokenBalance.result,
        currencyAddress: currency.contractAddress as HexString,
        vaultTokenId: currency.vaultTokenId ? BigInt(currency.vaultTokenId) : null,
        symbol: currency.symbol,
        decimals: currency.decimals,
        environment: this.network.testnet ? NETWORK_ENVIRONMENT.TESTNET : NETWORK_ENVIRONMENT.MAINNET,
      };

      if (!acc[networkSlug]) {
        acc[networkSlug] = {};
      }
      acc[networkSlug]![rpcBalance.currencyAddress] = rpcBalance;

      return acc;
    }, {});
  }

  async getBalance(address: HexString, symbol: string): Promise<RpcBalance> {
    const token = this.network.currencies.find((c: Currency) => c.symbol === symbol);
    if (!token) throw new Error(`Token ${symbol} not found.`);

    const { contractAddress: currencyAddress, nativeCurrency, decimals, vaultTokenId, id }: Currency = token;

    let balance: bigint;

    if (nativeCurrency) {
      balance = await getBalance(this.#publicClient, {
        address: address as Address,
      });
    } else {
      balance = await readContract(this.#publicClient, {
        address: currencyAddress as Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address as Address],
      });
    }

    return {
      id,
      balance,
      currencyAddress: currencyAddress as HexString,
      vaultTokenId: vaultTokenId ? BigInt(vaultTokenId) : null,
      symbol,
      decimals,
      environment: this.network.testnet ? NETWORK_ENVIRONMENT.TESTNET : NETWORK_ENVIRONMENT.MAINNET,
    } satisfies RpcBalance;
  }
}

export { EvmRpc };
