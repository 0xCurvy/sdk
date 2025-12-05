import {
  type Address,
  createPublicClient,
  createWalletClient,
  decodeFunctionResult,
  encodeFunctionData,
  erc20Abi,
  getContract,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import type { SignTransactionRequest } from "viem/_types/actions/wallet/signTransaction";
import { privateKeyToAccount } from "viem/accounts";
import { getBalance, readContract } from "viem/actions";
import { NETWORK_ENVIRONMENT } from "@/constants/networks";
import { evmMulticall3Abi } from "@/contracts/evm/abi/multicall3";
import { vaultV1Abi } from "@/contracts/evm/abi/vault";
import { Rpc } from "@/rpc/abstract";
import type { RpcBalance, RpcBalances, VaultBalance } from "@/types";
import type { CurvyAddress } from "@/types/address";
import type { Network } from "@/types/api";
import type { HexString } from "@/types/helper";
import { parseDecimal } from "@/utils/currency";
import { toSlug } from "@/utils/helpers";
import { generateViemChainFromNetwork } from "@/utils/rpc";

class EvmRpc extends Rpc {
  readonly #publicClient: PublicClient;
  readonly #walletClient: WalletClient;

  constructor(network: Network) {
    super(network);

    const chain = generateViemChainFromNetwork(network);

    this.#publicClient = createPublicClient({
      transport: http(this.network.rpcUrl),
      name: `CurvyEvmPublicClient-${toSlug(network.name)}`,
      chain,
    });

    this.#walletClient = createWalletClient({
      transport: http(this.network.rpcUrl),
      name: `CurvyEvmWalletClient-${toSlug(network.name)}`,
      chain,
    });
  }

  get provider() {
    return this.#publicClient;
  }

  get walletClient() {
    return this.#walletClient;
  }

  async getBalances(stealthAddress: HexString) {
    const evmMulticall = getContract({
      abi: evmMulticall3Abi,
      address: this.network.multiCallContractAddress as Address,
      client: this.#publicClient,
    });

    const calls = this.network.currencies.map(({ nativeCurrency, contractAddress }) => {
      if (nativeCurrency) {
        return {
          target: evmMulticall.address,
          callData: encodeFunctionData({
            abi: evmMulticall3Abi,
            functionName: "getEthBalance",
            args: [stealthAddress as Address],
          }),
          gasLimit: 30_000n,
        };
      }

      return {
        target: contractAddress as Address,
        callData: encodeFunctionData({
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [stealthAddress as Address],
        }),
        gasLimit: 30_000n,
      };
    });

    const {
      result: [_, tokenBalances],
    } = await evmMulticall.simulate.aggregate([calls]);

    const networkSlug = toSlug(this.network.name);

    return tokenBalances
      .map((encodedTokenBalance, idx) => {
        const {
          contractAddress: currencyAddress,
          nativeCurrency,
          symbol,
          decimals,
          vaultTokenId,
        } = this.network.currencies[idx];

        let balance: bigint;

        if (nativeCurrency)
          balance = decodeFunctionResult({
            abi: evmMulticall3Abi,
            functionName: "getEthBalance",
            data: encodedTokenBalance,
          });
        else
          balance = decodeFunctionResult({
            abi: erc20Abi,
            functionName: "balanceOf",
            data: encodedTokenBalance,
          });

        return balance
          ? {
              balance,
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

  async #prepareTx(privateKey: HexString, address: Address, amount: string, currencySymbol: string) {
    const token = this.network.currencies.find((c) => c.symbol === currencySymbol);
    if (!token) throw new Error(`Token ${currencySymbol} not found.`);

    const account = privateKeyToAccount(privateKey);

    const txRequestBase = {
      account,
      chain: this.#walletClient.chain,
    } as const;

    if (token.nativeCurrency) {
      const gasLimit = await this.#publicClient
        .estimateGas({
          account,
          to: address,
          value: parseDecimal(amount, token),
        })
        .then((res) => res)
        .catch(() => 21_000n);

      return this.#walletClient.prepareTransactionRequest({
        ...txRequestBase,
        to: address,
        value: parseDecimal(amount, token),
        gas: gasLimit,
      });
    }

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      // No parse units, use Currency utils
      args: [address, parseDecimal(amount, token)],
    });

    const gasLimit = await this.#publicClient
      .estimateContractGas({
        account,
        address: token.contractAddress as Address,
        abi: erc20Abi,
        functionName: "transfer",
        // No parse units, use Currency utils
        args: [address, parseDecimal(amount, token)],
      })
      .then((res) => res)
      .catch(() => 65_000n);

    return this.#walletClient.prepareTransactionRequest({
      ...txRequestBase,
      to: token.contractAddress as Address,
      gas: gasLimit,
      data,
      value: 0n,
    });
  }

  async sendToAddress(
    _curvyAddress: CurvyAddress,
    privateKey: HexString,
    address: string,
    amount: string,
    currencySymbol: string,
    _fee?: bigint,
  ) {
    const txRequest = await this.#prepareTx(privateKey, address as `0x${string}`, amount, currencySymbol);
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

  async estimateFee(
    _curvyAddress: CurvyAddress,
    privateKey: HexString,
    address: Address,
    amount: string,
    currency: string,
  ) {
    const txRequest = await this.#prepareTx(privateKey, address, amount, currency);

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
      abi: vaultV1Abi,
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
      chain: this.#walletClient.chain,
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
      chain: this.#walletClient.chain,
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
