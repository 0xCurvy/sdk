import { type Address, createPublicClient, createWalletClient, encodeFunctionData, erc20Abi, http } from "viem";
import type { SignTransactionRequest } from "viem/_types/actions/wallet/signTransaction";
import { privateKeyToAccount } from "viem/accounts";
import { getBalance, readContract } from "viem/actions";
import { NETWORK_ENVIRONMENT } from "@/constants/networks";
import { evmMulticall3Abi } from "@/contracts/evm/abi/multicall3";
import { vaultAbi } from "@/contracts/evm/abi/vault";
import { Rpc } from "@/rpc/abstract";
import type { RpcBalance, RpcBalances, VaultBalance } from "@/types";
import type { CurvyAddress } from "@/types/address";
import type { Network } from "@/types/api";
import type { HexString } from "@/types/helper";
import { toSlug } from "@/utils/helpers";
import {
  type CurvyPublicClient,
  type CurvyWalletClient,
  extendClientFromNetwork,
  generateViemChainFromNetwork,
} from "@/utils/rpc";

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

  async getBalances(stealthAddress: HexString) {
    const calls = this.network.currencies.map(({ nativeCurrency, contractAddress }) => {
      if (nativeCurrency) {
        return {
          address: this.network.multiCallContractAddress as Address,
          abi: evmMulticall3Abi,
          functionName: "getEthBalance",
          args: [stealthAddress as Address],
        };
      }

      return {
        address: contractAddress as Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [stealthAddress as Address],
      };
    });

    const tokenBalances = await this.#publicClient.multicall({ contracts: calls, allowFailure: true });

    const networkSlug = toSlug(this.network.name);

    return tokenBalances
      .map((tokenBalance, idx) => {
        const { contractAddress: currencyAddress, symbol, decimals, vaultTokenId } = this.network.currencies[idx];

        if (tokenBalance.error) {
          console.log(`Couldn't get balance for token ${currencyAddress}: `, tokenBalance.error);
          console.log("Network:", this.network.name, "multicall address:", this.network.multiCallContractAddress);
          return null;
        }

        return tokenBalance.result
          ? {
              balance: BigInt(tokenBalance.result),
              currencyAddress: currencyAddress as HexString,
              vaultTokenId: vaultTokenId ? BigInt(vaultTokenId) : null,
              symbol,
              decimals,
              environment: this.network.testnet ? NETWORK_ENVIRONMENT.TESTNET : NETWORK_ENVIRONMENT.MAINNET,
            }
          : null;
      })
      .filter(Boolean)
      .reduce<RpcBalances>((res, { balance, currencyAddress, vaultTokenId, symbol, environment, decimals }) => {
        if (!res[networkSlug]) res[networkSlug] = Object.create(null);
        res[networkSlug]![currencyAddress] = { balance, currencyAddress, vaultTokenId, symbol, environment, decimals };
        return res;
      }, Object.create(null));
  }

  async getBalance(stealthAddress: HexString, symbol: string) {
    const token = this.network.currencies.find((c) => c.symbol === symbol);
    if (!token) throw new Error(`Token ${symbol} not found.`);

    const { contractAddress: currencyAddress, nativeCurrency, decimals, vaultTokenId } = token;

    let balance: bigint;

    if (nativeCurrency) {
      balance = await getBalance(this.#publicClient, {
        address: stealthAddress as Address,
      });
    } else {
      balance = await readContract(this.#publicClient, {
        address: currencyAddress as Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [stealthAddress as Address],
      });
    }

    return {
      balance,
      currencyAddress: currencyAddress as HexString,
      vaultTokenId: vaultTokenId ? BigInt(vaultTokenId) : null,
      symbol,
      decimals,
      environment: this.network.testnet ? NETWORK_ENVIRONMENT.TESTNET : NETWORK_ENVIRONMENT.MAINNET,
    } satisfies RpcBalance;
  }

  async #prepareTx(privateKey: HexString, address: Address, amount: bigint, currencyAddress: HexString) {
    const currency = this.network.currencies.find((c) => c.contractAddress === currencyAddress);
    if (!currency) throw new Error(`Currency ${currencyAddress} not found.`);

    const account = privateKeyToAccount(privateKey);

    if (currency.nativeCurrency) {
      const gasLimit = await this.#publicClient
        .estimateGas({
          account,
          to: address,
          value: amount,
        })
        .then((res) => res)
        .catch(() => 21_000n);

      return this.#walletClient.prepareTransactionRequest({
        account,
        to: address,
        value: amount,
        gas: gasLimit,
      });
    }

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [address, amount],
    });

    const gasLimit = await this.#publicClient
      .estimateContractGas({
        account,
        address: currencyAddress,
        abi: erc20Abi,
        functionName: "transfer",
        args: [address, amount],
      })
      .then((res) => res)
      .catch(() => 65_000n);

    return this.#walletClient.prepareTransactionRequest({
      account,
      to: currencyAddress,
      gas: gasLimit,
      data,
      value: 0n,
    });
  }

  async sendToAddress(
    _curvyAddress: CurvyAddress,
    privateKey: HexString,
    address: string,
    amount: bigint,
    currencyAddress: HexString,
    _fee?: bigint,
  ) {
    const txRequest = await this.#prepareTx(privateKey, address as `0x${string}`, amount, currencyAddress);
    const serializedTransaction = await this.#walletClient.signTransaction(txRequest);

    const hash = await this.#walletClient.sendRawTransaction({ serializedTransaction });

    const receipt = await this.provider.waitForTransactionReceipt({
      hash,
    });

    const txExplorerUrl = `${this.network.blockExplorerUrl}/tx/${hash}`;

    return {
      txHash: hash,
      txExplorerUrl,
      receipt,
    };
  }

  async estimateTransactionFee(
    _curvyAddress: CurvyAddress,
    privateKey: HexString,
    address: Address,
    amount: bigint,
    currencyAddress: HexString,
  ) {
    const txRequest = await this.#prepareTx(privateKey, address, amount, currencyAddress);
    return txRequest ? txRequest.maxFeePerGas * txRequest.gas : 0n;
  }

  feeToAmount(feeEstimate: bigint): bigint {
    return feeEstimate;
  }

  async getVaultBalances(address: HexString): Promise<VaultBalance> {
    if (!this.network.vaultContractAddress) {
      throw new Error("Vault actions not supported on this network");
    }

    const vaultEnabledCurrencies = this.network.currencies.filter(({ vaultTokenId }) => vaultTokenId);
    const currencyIds = vaultEnabledCurrencies.map(({ vaultTokenId }) => BigInt(vaultTokenId!));

    const balances = await this.provider.readContract({
      abi: vaultAbi,
      address: this.network.vaultContractAddress as Address,
      functionName: "balanceOfBatch",
      args: [new Array(currencyIds.length).fill(address as Address), currencyIds],
    });

    return {
      network: toSlug(this.network.name),
      address,
      balances: balances.map((balance, idx) => {
        return {
          balance,
          currencyAddress: vaultEnabledCurrencies[idx].contractAddress,
          vaultTokenId: currencyIds[idx],
        };
      }),
    };
  }

  async estimateOnboardNativeToVault(from: HexString, amount: bigint) {
    if (!this.network.vaultContractAddress) {
      throw new Error("Vault actions not supported on this network");
    }
    const { maxFeePerGas } = await this.provider.estimateFeesPerGas();

    const gasLimit = await this.provider.estimateGas({
      account: from,
      value: amount,
      to: this.network.vaultContractAddress as Address,
    });

    return { maxFeePerGas, gasLimit };
  }

  async onboardNativeToVault(amount: bigint, privateKey: HexString, maxFeePerGas: bigint, gasLimit: bigint) {
    if (!this.network.vaultContractAddress) {
      throw new Error("Vault actions not supported on this network");
    }

    const hash = await this.#walletClient.sendTransaction({
      account: privateKeyToAccount(privateKey),
      maxFeePerGas,
      gasLimit,
      to: this.network.vaultContractAddress as HexString,
      value: amount,
    });

    const receipt = await this.provider.waitForTransactionReceipt({
      hash,
    });

    const txExplorerUrl = `${this.network.blockExplorerUrl}/tx/${hash}`;

    return {
      txHash: hash,
      txExplorerUrl,
      receipt,
    };
  }

  async signRawTransaction(privateKey: HexString, txRequest: SignTransactionRequest) {
    return this.#walletClient.signTransaction({
      account: privateKeyToAccount(privateKey),
      ...txRequest,
    });
  }

  async signMessage(privateKey: HexString, typedData: any) {
    return this.#walletClient.signTypedData({
      account: privateKeyToAccount,
      ...typedData,
    });
  }
}

export { EvmRpc };
