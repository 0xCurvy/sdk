import {
  Account,
  CairoCustomEnum,
  type Call,
  CallData,
  Contract,
  cairo,
  type constants,
  type DeployAccountContractPayload,
  type DeployContractResponse,
  type EstimateFee,
  EthSigner,
  hash,
  Provider,
  type RawArgs,
  validateAndParseAddress,
} from "starknet";
import type { Address } from "viem";
import { CURVY_ACCOUNT_CLASS_HASHES, CURVY_DUMMY_STARKNET_ACCOUNT } from "@/constants/starknet";
import { starknetAccountAbi } from "@/contracts/starknet/abi/account";
import { starknetErc20Abi } from "@/contracts/starknet/abi/erc20";
import { starknetMulticallAbi } from "@/contracts/starknet/abi/multicall";
import type { CurvyAddress, CurvyAddressBalances } from "@/types/address";
import type { Network } from "@/types/api";
import type { GasSponsorshipRequest } from "@/types/gas-sponsorship";
import type { HexString } from "@/types/helper";
import type { StarknetFeeEstimate } from "@/types/rpc";
import { parseDecimal } from "@/utils/currency";
import { decimalStringToHex } from "@/utils/decimal-conversions";
import { toSlug } from "@/utils/helpers";
import { fromUint256 } from "@/utils/rpc";
import { Rpc } from "./abstract";

class StarknetRpc extends Rpc {
  readonly #provider: Provider;

  constructor(network: Network) {
    super(network);
    this.#provider = new Provider({
      chainId: network.chainId as constants.StarknetChainId,
      nodeUrl: network.rpcUrl,
    });
  }

  async getBalances(stealthAddress: CurvyAddress) {
    const starkMulticall = new Contract(
      starknetMulticallAbi,
      this.network.multiCallContractAddress as Address,
      this.#provider,
    ).typedv2(starknetMulticallAbi);

    const calls = this.network.currencies.map(({ contractAddress }) => ({
      execution: new CairoCustomEnum({
        Static: {},
      }),
      to: new CairoCustomEnum({
        Hardcoded: contractAddress,
      }),
      selector: new CairoCustomEnum({
        Hardcoded: hash.getSelectorFromName("balance_of"),
      }),
      calldata: [new CairoCustomEnum({ Hardcoded: stealthAddress.address })],
    }));

    const tokenBalances = await starkMulticall.aggregate(calls);

    const networkSlug = toSlug(this.network.name);

    return tokenBalances
      .map(([low, high], idx) => {
        const { contractAddress: tokenAddress, ...token } = this.network.currencies[idx];

        const tokenMeta = {
          decimals: token.decimals,
          iconUrl: token.iconUrl,
          name: token.name,
          symbol: token.symbol,
          native: token.nativeCurrency,
        };

        const networkMeta = {
          testnet: this.network.testnet,
          flavour: this.network.flavour,
          group: this.network.group,
          slug: networkSlug,
        };

        return {
          balance: fromUint256(low, high),
          tokenAddress: tokenAddress as HexString | undefined,
          tokenMeta,
          networkMeta,
        };
      })
      .filter((token) => Boolean(token.balance))
      .reduce<CurvyAddressBalances>((res, data) => {
        if (!res[networkSlug]) res[networkSlug] = Object.create(null);
        res[networkSlug]![data.tokenMeta.symbol] = data;
        return res;
      }, Object.create(null));
  }

  async getBalance(stealthAddress: CurvyAddress, symbol: string) {
    const token = this.network.currencies.find((c) => c.symbol === symbol);
    if (!token) throw new Error(`Token ${symbol} not found.`);

    const { contractAddress: tokenAddress } = token;

    const tokenMeta = {
      decimals: token.decimals,
      iconUrl: token.iconUrl,
      name: token.name,
      symbol: token.symbol,
      native: token.nativeCurrency,
    };

    const networkMeta = {
      testnet: this.network.testnet,
      flavour: this.network.flavour,
      group: this.network.group,
      slug: toSlug(this.network.name),
    };

    const starkErc20 = new Contract(starknetErc20Abi, token.contractAddress as Address, this.#provider).typedv2(
      starknetErc20Abi,
    );

    let balance = await starkErc20.balance_of(stealthAddress.address);

    if (typeof balance === "number") balance = BigInt(balance);
    if (typeof balance !== "bigint" && "low" in balance && "high" in balance)
      balance = fromUint256(balance.low, balance.high);

    return { balance, tokenAddress: tokenAddress as HexString | undefined, tokenMeta, networkMeta };
  }

  #prepareTx(curvyAddress: CurvyAddress, privateKey: HexString, address: Address, amount: string, currency: string) {
    const token = this.network.currencies.find((c) => c.symbol === currency);
    if (!token) throw new Error(`Token ${currency} not found.`);

    const starknetAccount = new Account(this.#provider, curvyAddress.address, new EthSigner(privateKey));

    const txPayload = {
      contractAddress: token.contractAddress as string,
      entrypoint: "transfer",
      calldata: CallData.compile({
        to: address,
        amount: cairo.uint256(parseDecimal(amount, token)),
      }),
    } satisfies Call;

    return { starknetAccount, txPayload };
  }

  async #estimateFee(starknetAccount: Account, txPayload: Call) {
    return starknetAccount.estimateFee(txPayload, {
      version: 3,
      skipValidate: false,
      resourceBounds: {
        l1_gas: {
          max_amount: "0x0",
          max_price_per_unit: "0x0",
        },
        l2_gas: {
          max_amount: "0x0",
          max_price_per_unit: "0x0",
        },
        l1_data_gas: {
          max_amount: "0x0",
          max_price_per_unit: "0x0",
        },
      },
    });
  }

  async #checkIsStarknetAccountDeployed(stealthAddress: CurvyAddress): Promise<boolean> {
    return this.#provider
      .getClassHashAt(stealthAddress.address)
      .then(() => true)
      .catch(() => false);
  }

  #getStarknetAccountClassHash(address: Address, constructorCalldata: RawArgs, salt = "0x3327") {
    return CURVY_ACCOUNT_CLASS_HASHES.find((classHash) => {
      const computedAddress = hash.calculateContractAddressFromHash(salt, classHash, constructorCalldata, 0);
      if (validateAndParseAddress(computedAddress) === validateAndParseAddress(address)) {
        return classHash;
      }
    });
  }

  async #prepareDeploy(curvyAddress: CurvyAddress, privateKey: HexString) {
    const starknetAccount = new Account(this.#provider, curvyAddress.address, new EthSigner(privateKey));

    const hexPubKey = decimalStringToHex(curvyAddress.publicKey, false);

    const myCallData = new CallData(starknetAccountAbi);
    const constructorCalldata = myCallData.compile("constructor", {
      public_key: hexPubKey,
    });

    const classHash = this.#getStarknetAccountClassHash(curvyAddress.address as Address, constructorCalldata);

    if (!classHash) throw new Error("Tried to construct deploy payload with unsupported class hash!");

    const deployPayload = {
      classHash,
      constructorCalldata: constructorCalldata,
      addressSalt: "0x3327",
    } satisfies DeployAccountContractPayload;

    return { starknetAccount, deployPayload };
  }

  async #estimateDeployFee(curvyAddress: CurvyAddress, privateKey: HexString) {
    const { starknetAccount, deployPayload } = await this.#prepareDeploy(curvyAddress, privateKey);

    return starknetAccount.estimateAccountDeployFee(deployPayload, {
      version: 3,
      skipValidate: false,
      resourceBounds: {
        l1_gas: {
          max_amount: "0xffffffffffffffff",
          max_price_per_unit: "0x0",
        },
        l2_gas: {
          max_amount: "0xffffffffffffffff",
          max_price_per_unit: "0x0",
        },
        l1_data_gas: {
          max_amount: "0xffffffffffffffff",
          max_price_per_unit: "0x0",
        },
      },
    });
  }

  async estimateDeployFee(curvyAddress: CurvyAddress, privateKey: HexString, skipCheck = false): Promise<bigint> {
    if (!skipCheck && (await this.#checkIsStarknetAccountDeployed(curvyAddress)))
      throw new Error(`Starknet account with address: ${curvyAddress.address} already deployed.`);

    const deployFeeEstimate = await this.#estimateDeployFee(curvyAddress, privateKey);
    return deployFeeEstimate.overall_fee;
  }

  async deployStarknetAccount(
    curvyAddress: CurvyAddress,
    privateKey: HexString,
    skipCheck = false,
    fee?: EstimateFee,
  ): Promise<DeployContractResponse> {
    if (!skipCheck && (await this.#checkIsStarknetAccountDeployed(curvyAddress)))
      throw new Error(`Starknet account with address: ${curvyAddress.address} already deployed.`);

    const { starknetAccount, deployPayload } = await this.#prepareDeploy(curvyAddress, privateKey);

    let deployFeeEstimate: EstimateFee;
    if (fee === undefined) {
      deployFeeEstimate = await this.#estimateDeployFee(curvyAddress, privateKey);
    } else {
      deployFeeEstimate = fee;
    }

    return starknetAccount.deployAccount(deployPayload, {
      version: 3,
      resourceBounds: deployFeeEstimate.resourceBounds,
      maxFee: deployFeeEstimate.suggestedMaxFee,
    });
  }

  async sendToAddress(
    curvyAddress: CurvyAddress,
    privateKey: HexString,
    address: string,
    amount: string,
    currency: string,
    fee?: StarknetFeeEstimate,
  ) {
    if (!(await this.#checkIsStarknetAccountDeployed(curvyAddress))) {
      await this.deployStarknetAccount(curvyAddress, privateKey, true, fee?.deployFee);
    }

    const { starknetAccount, txPayload } = this.#prepareTx(
      curvyAddress,
      privateKey,
      address as `0x${string}`,
      amount,
      currency,
    );

    let feeEstimate: EstimateFee;
    if (fee === undefined) {
      feeEstimate = await this.#estimateFee(starknetAccount, txPayload);
    } else {
      feeEstimate = fee.transactionFee;
    }

    return this.#provider.waitForTransaction(
      (
        await starknetAccount.execute([txPayload], {
          version: 3,
          resourceBounds: feeEstimate.resourceBounds,
          maxFee: feeEstimate.suggestedMaxFee,
        })
      ).transaction_hash,
    );
  }

  async estimateFee(
    curvyAddress: CurvyAddress,
    privateKey: HexString,
    address: Address,
    amount: string,
    currency: string,
  ): Promise<StarknetFeeEstimate> {
    let deployFee: EstimateFee | undefined;
    const isDeployed = await this.#checkIsStarknetAccountDeployed(curvyAddress);
    if (!isDeployed) {
      deployFee = await this.#estimateDeployFee(curvyAddress, privateKey);
    }

    let { starknetAccount, txPayload } = this.#prepareTx(curvyAddress, privateKey, address, amount, currency);

    if (!isDeployed) {
      // Try to fool the estimator so that we can extract total fee (deploy + tx) for undeployed account.
      // This is a dummy Address/PK not used for anything.
      // Don't pointlessly send security vulnerability reports - rather teach us how to estimate undeployed account
      // transactions without this.
      starknetAccount = new Account(
        this.#provider,
        CURVY_DUMMY_STARKNET_ACCOUNT.address,
        CURVY_DUMMY_STARKNET_ACCOUNT.pk,
      );
    }

    const transactionFee = await this.#estimateFee(starknetAccount, txPayload);

    return { transactionFee, deployFee };
  }

  feeToAmount(feeEstimate: StarknetFeeEstimate): bigint {
    return BigInt(feeEstimate.transactionFee.overall_fee) + BigInt(feeEstimate?.deployFee?.overall_fee ?? 0n);
  }

  async getAccountPubKeyForSignatureVerification(
    walletId: "argentX" | "braavos" | (string & {}),
    address: string,
  ): Promise<string> {
    const accountAddress = validateAndParseAddress(address);

    const { abi: accountABI } = await this.#provider.getClassAt(accountAddress);
    if (accountABI === undefined) {
      throw new Error("No available account ABI.");
    }

    const accountContract = new Contract(accountABI, accountAddress, this.#provider);

    switch (walletId) {
      case "argentX": {
        return (await accountContract.get_owner()).toString(16);
      }
      case "braavos": {
        return (await accountContract.get_public_key()).toString(16);
      }
      default: {
        throw new Error(`Unsupported wallet ID: ${walletId}`);
      }
    }
  }

  prepareCSUCOnboardTransactions(
    _privateKey: HexString,
    _toAddress: string,
    _currency: string,
    _amount: string,
  ): Promise<GasSponsorshipRequest> {
    throw new Error("CSUC is not supported on Starknet");
  }
}

export { StarknetRpc };
