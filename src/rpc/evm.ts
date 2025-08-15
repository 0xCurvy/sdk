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
  parseEther,
  parseUnits,
  type TransactionRequest,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getBalance, readContract } from "viem/actions";
import { evmMulticall3Abi } from "@/contracts/evm/abi/multicall3";
import { ARTIFACT as CSUC_ETH_SEPOLIA_ARTIFACT } from "@/contracts/evm/curvy-artifacts/ethereum-sepolia/CSUC";
import { Rpc } from "@/rpc/abstract";
import type { CurvyAddress, CurvyAddressBalances } from "@/types/address";
import type { Network } from "@/types/api";
import type { GasSponsorshipRequest } from "@/types/gas-sponsorship";
import type { HexString } from "@/types/helper";
import { jsonStringify } from "@/utils/common";
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

    const calls = this.network.currencies.map(({ contract_address }) => {
      if (!contract_address)
        return {
          target: evmMulticall.address,
          callData: encodeFunctionData({
            abi: evmMulticall3Abi,
            functionName: "getEthBalance",
            args: [stealthAddress.address as Address],
          }),
          gasLimit: 30_000n,
        };

      return {
        target: contract_address as Address,
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
        const { contract_address: tokenAddress, ...token } = this.network.currencies[idx];

        const tokenMeta = {
          decimals: token.decimals,
          iconUrl: token.icon_url,
          name: token.name,
          symbol: token.symbol,
          native: token.native,
        };

        const networkMeta = {
          testnet: this.network.testnet,
          flavour: this.network.flavour,
          group: this.network.group,
          slug: networkSlug,
        };

        let balance = 0n;

        if (!tokenAddress)
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
          ? { balance, tokenAddress: tokenAddress as HexString | undefined, tokenMeta, networkMeta }
          : null;
      })
      .filter(Boolean)
      .reduce<CurvyAddressBalances>((res, data) => {
        if (!res[networkSlug]) res[networkSlug] = Object.create(null);
        res[networkSlug]![data.tokenMeta.symbol] = data;
        return res;
      }, Object.create(null));
  }

  async getBalance(stealthAddress: CurvyAddress, symbol: string) {
    const token = this.network.currencies.find((c) => c.symbol === symbol);
    if (!token) throw new Error(`Token ${symbol} not found.`);

    const { contract_address: tokenAddress } = token;

    const tokenMeta = {
      decimals: token.decimals,
      iconUrl: token.icon_url,
      name: token.name,
      symbol: token.symbol,
      native: token.native,
    };

    const networkMeta = {
      testnet: this.network.testnet,
      flavour: this.network.flavour,
      group: this.network.group,
      slug: toSlug(this.network.name),
    };

    let balance = 0n;

    if (!token.contract_address) {
      balance = await getBalance(this.#publicClient, {
        address: stealthAddress.address as Address,
      });
    } else
      balance = await readContract(this.#publicClient, {
        address: token.contract_address as Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [stealthAddress.address as Address],
      });

    return { balance, tokenAddress: tokenAddress as HexString | undefined, tokenMeta, networkMeta };
  }

  async #prepareTx(privateKey: HexString, address: Address, amount: string, currencySymbol: string) {
    const token = this.network.currencies.find((c) => c.symbol === currencySymbol);
    if (!token) throw new Error(`Token ${currencySymbol} not found.`);

    const account = privateKeyToAccount(privateKey);

    const txRequestBase = {
      account,
      chain: this.#walletClient.chain,
    } as const;

    if (token.contract_address === undefined) {
      const gasLimit = await this.#publicClient
        .estimateGas({
          account,
          to: address,
          value: parseEther(amount),
        })
        .then((res) => res)
        .catch(() => 21_000n);

      return this.#walletClient.prepareTransactionRequest({
        ...txRequestBase,
        to: address,
        value: parseEther(amount),
        gas: gasLimit,
      });
    }

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [address, parseUnits(amount, token.decimals)],
    });

    const gasLimit = await this.#publicClient
      .estimateContractGas({
        account,
        address: token.contract_address as Address,
        abi: erc20Abi,
        functionName: "transfer",
        args: [address, parseUnits(amount, token.decimals)],
      })
      .then((res) => res)
      .catch(() => 65_000n);

    return this.#walletClient.prepareTransactionRequest({
      ...txRequestBase,
      to: token.contract_address as Address,
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

    return this.#walletClient.sendRawTransaction({ serializedTransaction });
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

  // TODO: Allow onboarding native currency (ETH as well) within this method
  async prepareCSUCOnboardTransactions(
    privateKey: HexString,
    toAddress: `0x${string}`,
    currencySymbol: string,
    amount: string,
  ): Promise<GasSponsorshipRequest> {
    const token = this.network.currencies.find((c) => c.symbol === currencySymbol);
    if (!token) throw new Error(`Token ${currencySymbol} not found.`);

    if (!token.contract_address) {
      throw new Error("Token contract address is not defined.");
    }

    // Legacy CSA
    const account = privateKeyToAccount(privateKey);

    const csucContractAddress = this.network.csucContractAddress as `0x${string}`;

    if (!csucContractAddress) {
      throw new Error("CSUC contract address not found for the specified network.");
    }
    let nonce = await this.publicClient.getTransactionCount({
      address: account.address,
    });

    const accountClient = { ...this.walletClient, account };

    const txInfo = [
      // ERC20 approve transaction
      {
        to: token.contract_address as Address,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [csucContractAddress, BigInt(amount)],
        }),
        gas: 70_000n,
        nonce,
      },
      // CSUC wrap transaction
      {
        to: csucContractAddress,
        data: encodeFunctionData({
          abi: CSUC_ETH_SEPOLIA_ARTIFACT.abi,
          functionName: "wrapERC20",
          args: [toAddress, token.contract_address as `0x${string}`, BigInt(amount)],
        }),
        gas: 120_000n,
        nonce: ++nonce,
      },
    ];

    const payloads: TransactionRequest[] = [];
    const signedPayloads: string[] = [];
    // const decodedSignedPayloads: TransactionSerializable[] = [];

    for (const txI of txInfo) {
      const pTx = await accountClient.prepareTransactionRequest({
        ...txI,
        value: 0n,
        gasPrice: 1_000_000_000n, // 1 GWei
        account,
        chain: accountClient.chain,
      });

      const sTx = await accountClient.signTransaction(pTx);
      // const dTx = parseTransaction(sTx);

      payloads.push(pTx);
      signedPayloads.push(sTx);
      // decodedSignedPayloads.push(dTx);
    }
    return {
      networkId: 1, // Ethereum Sepolia
      payloads: payloads.map((p) => ({
        data: jsonStringify(p),
      })),
      signedPayloads,
    };
  }
}

export { EvmRpc };
