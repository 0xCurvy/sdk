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
  type TransactionRequest,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getBalance, readContract } from "viem/actions";
import { NETWORK_ENVIRONMENT } from "@/constants/networks";
import { erc1155ABI } from "@/contracts/evm/abi/erc1155";
import { evmMulticall3Abi } from "@/contracts/evm/abi/multicall3";
import { ARTIFACT as CSUC_ETH_SEPOLIA_ARTIFACT } from "@/contracts/evm/curvy-artifacts/ethereum-sepolia/CSUC";
import { Rpc } from "@/rpc/abstract";
import { type BalanceEntry, type Erc1155Balance, isSaBalanceEntry, type RpcBalance, type RpcBalances } from "@/types";
import type { CurvyAddress } from "@/types/address";
import type { Currency, Network } from "@/types/api";
import type { GasSponsorshipRequest } from "@/types/gas-sponsorship";
import type { HexString } from "@/types/helper";
import { jsonStringify } from "@/utils/common";
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

  get publicClient() {
    return this.#publicClient;
  }

  get walletClient() {
    return this.#walletClient;
  }

  async getBalances(stealthAddress: CurvyAddress) {
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
            args: [stealthAddress.address as Address],
          }),
          gasLimit: 30_000n,
        };
      }

      return {
        target: contractAddress as Address,
        callData: encodeFunctionData({
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [stealthAddress.address as Address],
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
        const { contractAddress: currencyAddress, nativeCurrency, symbol, decimals } = this.network.currencies[idx];

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
              symbol,
              decimals,
              environment: this.network.testnet ? NETWORK_ENVIRONMENT.TESTNET : NETWORK_ENVIRONMENT.MAINNET,
            }
          : null;
      })
      .filter(Boolean)
      .reduce<RpcBalances>((res, { balance, currencyAddress, symbol, environment, decimals }) => {
        if (!res[networkSlug]) res[networkSlug] = Object.create(null);
        res[networkSlug]![currencyAddress] = { balance, currencyAddress, symbol, environment, decimals };
        return res;
      }, Object.create(null));
  }

  async getBalance(stealthAddress: CurvyAddress, symbol: string) {
    const token = this.network.currencies.find((c) => c.symbol === symbol);
    if (!token) throw new Error(`Token ${symbol} not found.`);

    const { contractAddress: currencyAddress, nativeCurrency, decimals } = token;

    let balance: bigint;

    if (nativeCurrency) {
      balance = await getBalance(this.#publicClient, {
        address: stealthAddress.address as Address,
      });
    } else {
      balance = await readContract(this.#publicClient, {
        address: currencyAddress as Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [stealthAddress.address as Address],
      });
    }

    return {
      balance,
      currencyAddress: currencyAddress as HexString,
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

    const receipt = await this.publicClient.waitForTransactionReceipt({
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

  async onboardNativeToCSUC(input: BalanceEntry, privateKey: HexString, currency: Currency, amount: string) {
    if (!this.network.erc1155ContractAddress) {
      throw new Error("[CSUCOnboard]: CSUC actions not supported on this network");
    }

    if (!isSaBalanceEntry(input)) {
      throw new Error("Input balance entry must be of SA type");
    }

    const { maxFeePerGas } = await this.publicClient.estimateFeesPerGas();

    const gasLimit = await this.#publicClient
      .estimateContractGas({
        account: privateKeyToAccount(privateKey),
        address: this.network.erc1155ContractAddress as HexString,
        abi: CSUC_ETH_SEPOLIA_ARTIFACT.abi,
        functionName: "wrapNative",
        args: [input.source as HexString],
        value: 1n,
      })
      .then((res) => res)
      .catch(() => 65_000n); // Generous overhead in case of estimation failure

    const fee = gasLimit * ((maxFeePerGas * 120n) / 100n); // add 20% buffer

    const hash = await this.walletClient.writeContract({
      abi: CSUC_ETH_SEPOLIA_ARTIFACT.abi,
      functionName: "wrapNative",
      account: privateKeyToAccount(privateKey),
      chain: this.#walletClient.chain,
      address: this.network.erc1155ContractAddress as HexString,
      args: [input.source as HexString],
      value: parseDecimal(amount, currency) - fee,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash,
    });

    const txExplorerUrl = `${this.network.blockExplorerUrl}/tx/${hash}`;

    return {
      txHash: hash,
      txExplorerUrl,
      receipt,
    };
  }

  async injectErc1155Ids(currencies: Currency[]) {
    if (!this.network.erc1155ContractAddress) {
      throw new Error(" Erc1155 actions not supported on this network");
    }

    const evmMulticall = getContract({
      abi: evmMulticall3Abi,
      address: this.network.multiCallContractAddress as Address,
      client: this.#publicClient,
    });

    const currencyMap = new Map(currencies.map((c) => [c.id, c]));

    const filteredCurrencies = currencies.filter(({ erc1155Enabled }) => erc1155Enabled);

    const calls = filteredCurrencies.map(({ contractAddress }) => {
      return {
        target: this.network.erc1155ContractAddress as Address,
        callData: encodeFunctionData({
          abi: erc1155ABI,
          functionName: "getTokenID",
          args: [contractAddress as Address],
        }),
        gasLimit: 30_000n,
      };
    });

    const {
      result: [_, erc1155Ids],
    } = await evmMulticall.simulate.aggregate([calls]);

    erc1155Ids.forEach((encodedErc1155Id, idx) => {
      const erc1155Id = decodeFunctionResult({
        abi: erc1155ABI,
        functionName: "getTokenID",
        data: encodedErc1155Id,
      });

      const currency = filteredCurrencies[idx];

      currencyMap.set(currency.id, { ...currency, erc1155Enabled: true, erc1155Id });
    });

    return Array.from(currencyMap.values());
  }

  async getErc1155Balances({ address }: CurvyAddress): Promise<Erc1155Balance> {
    if (!this.network.erc1155ContractAddress) {
      throw new Error(" Erc1155 actions not supported on this network");
    }

    const erc1155EnabledCurrencies = this.network.currencies.filter(({ erc1155Enabled }) => erc1155Enabled);

    const balances = await this.publicClient.readContract({
      abi: erc1155ABI,
      address: this.network.erc1155ContractAddress as Address,
      functionName: "balanceOfBatch",
      args: [[address], erc1155EnabledCurrencies.flatMap((c) => (c.erc1155Enabled ? c.erc1155Id : []))],
    });

    return {
      network: toSlug(this.network.name),
      address,
      balances: balances.map((balance, idx) => {
        return { balance, currencyAddress: erc1155EnabledCurrencies[idx].contractAddress };
      }),
    };
  }

  async prepareCSUCOnboardTransaction(
    privateKey: HexString,
    toAddress: HexString,
    currency: Currency,
    amount: string,
  ): Promise<GasSponsorshipRequest> {
    if (!this.network.erc1155ContractAddress) {
      throw new Error("[CSUCOnboard]: CSUC actions not supported on this network");
    }

    // Legacy CSA
    const account = privateKeyToAccount(privateKey);

    let nonce = await this.publicClient.getTransactionCount({
      address: account.address,
    });

    const accountClient = { ...this.walletClient, account };

    const txInfo = [
      // ERC20 approve transaction
      {
        to: currency.contractAddress as HexString,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [this.network.erc1155ContractAddress as HexString, parseDecimal(amount, currency)],
        }),
        gas: 70_000n,
        nonce,
      },
      // CSUC wrap transaction
      {
        to: this.network.erc1155ContractAddress as HexString,
        data: encodeFunctionData({
          abi: CSUC_ETH_SEPOLIA_ARTIFACT.abi,
          functionName: "wrapERC20",
          args: [toAddress, currency.contractAddress as `0x${string}`, parseDecimal(amount, currency)],
        }),
        gas: 120_000n,
        nonce: ++nonce,
      },
    ];

    const payloads: TransactionRequest[] = [];
    const signedPayloads: string[] = [];

    for (const txI of txInfo) {
      const pTx = await accountClient.prepareTransactionRequest({
        ...txI,
        value: 0n,
        gasPrice: 1_000_000_000n, // 1 GWei
        account,
        chain: accountClient.chain,
      });

      const sTx = await accountClient.signTransaction(pTx);

      payloads.push(pTx);
      signedPayloads.push(sTx);
    }

    return {
      networkId: this.network.id,
      payloads: payloads.map((p) => ({
        data: jsonStringify(p),
      })),
      signedPayloads,
    };
  }
}

export { EvmRpc };
