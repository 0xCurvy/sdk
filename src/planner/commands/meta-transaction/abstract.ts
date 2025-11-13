import { privateKeyToAccount } from "viem/accounts";
import { vaultV1Abi } from "@/contracts/evm/abi";
import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { EvmRpc } from "@/rpc";
import {
  BALANCE_TYPE,
  type BalanceEntry,
  type HexString,
  META_TRANSACTION_NUMERIC_TYPES,
  META_TRANSACTION_TYPES,
  type MetaTransactionType,
  type Network,
  type SaBalanceEntry,
  type VaultBalanceEntry,
} from "@/types";

export abstract class AbstractMetaTransactionCommand extends CurvyCommand {
  protected declare input: SaBalanceEntry | VaultBalanceEntry;
  protected rpc: EvmRpc;

  protected constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);
    const rpc = sdk.rpcClient.Network(this.input.networkSlug);

    if (!(rpc instanceof EvmRpc)) {
      throw new Error("AbstractMetaTransactionCommand only supports EVM networks.");
    }

    this.rpc = rpc;
  }

  protected async signMetaTransaction(to: HexString) {
    if (!this.estimateData) {
      throw new Error("Command not estimated.");
    }

    const rpc = this.sdk.rpcClient.Network(this.network.name);
    // const address = await this.sdk.storage.getCurvyAddress(this.input.source);
    const privateKey = await this.sdk.walletManager.getAddressPrivateKey(this.input.source);

    const nonce = await rpc.provider.readContract({
      abi: vaultV1Abi,
      address: this.network.vaultContractAddress as HexString,
      functionName: "getNonce",
      args: [this.input.source as HexString],
    });

    const tokenId = await rpc.provider.readContract({
      abi: vaultV1Abi,
      address: this.network.vaultContractAddress as HexString,
      functionName: "getTokenId",
      args: [this.input.currencyAddress as HexString],
    });

    const account = privateKeyToAccount(privateKey);

    return account.signTypedData({
      domain: {
        name: "Curvy Privacy Vault",
        version: this.network.vaultContractVersion,
        chainId: BigInt(this.network.chainId),
        verifyingContract: this.network.vaultContractAddress as HexString,
      },
      primaryType: "CurvyMetaTransaction",
      types: {
        CurvyMetaTransaction: [
          { name: "nonce", type: "uint256" },
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "amount", type: "uint256" },
          { name: "gasFee", type: "uint256" },
          { name: "metaTransactionType", type: "uint8" },
        ],
      },
      message: {
        nonce,
        from: this.input.source as HexString,
        to,
        tokenId: BigInt(tokenId),
        amount: this.input.balance,
        gasFee: this.estimateData.gasFeeInCurrency,
        metaTransactionType: META_TRANSACTION_NUMERIC_TYPES[this.getMetaTransactionType()],
      },
    });
  }

  abstract getMetaTransactionType(): MetaTransactionType;

  abstract getToAddress(): HexString;

  protected getNetAmount(): bigint {
    if (!this.estimateData) {
      throw new Error("Command not estimated.");
    }

    return this.input.balance - this.estimateData.gasFeeInCurrency - this.estimateData.curvyFeeInCurrency;
  }

  protected async calculateCurvyFee(): Promise<bigint> {
    const rpc = this.sdk.rpcClient.Network(this.network.name);

    const mapMetaTransactionTypeToFeeVariableName = {
      [META_TRANSACTION_TYPES.VAULT_WITHDRAW]: "withdrawalFee",
      [META_TRANSACTION_TYPES.VAULT_TRANSFER]: "transferFee",
      [META_TRANSACTION_TYPES.VAULT_DEPOSIT_TO_AGGREGATOR]: "transferFee",
      [META_TRANSACTION_TYPES.VAULT_ONBOARD]: "depositFee",
    } as const;

    const metaTransactionType = this.getMetaTransactionType();

    if (!(metaTransactionType in mapMetaTransactionTypeToFeeVariableName)) {
      throw new Error(`Meta transaction type ${this.getMetaTransactionType()} is not supported.`);
    }

    return rpc.provider.readContract({
      abi: vaultV1Abi,
      address: this.network.vaultContractAddress as HexString,
      functionName: mapMetaTransactionTypeToFeeVariableName[metaTransactionType],
      args: [],
    });
  }

  async estimate(ownerHash?: bigint) {
    const { id, gasFeeInCurrency } = await this.sdk.apiClient.metaTransaction.EstimateGas({
      type: this.getMetaTransactionType(),
      currencyAddress: this.input.currencyAddress,
      amount: this.input.balance.toString(),
      fromAddress: this.input.source,
      toAddress: this.network.aggregatorContractAddress as HexString,
      network: this.input.networkSlug,
      ownerHash: ownerHash ? `0x${ownerHash.toString(16)}` : undefined,
    });

    const curvyFeeInCurrency = await this.calculateCurvyFee();

    return { id, gasFeeInCurrency: BigInt(gasFeeInCurrency ?? "0"), curvyFeeInCurrency };
  }

  async getResultingBalanceEntry(): Promise<BalanceEntry | undefined> {
    return Promise.resolve(undefined);
  }
}

export abstract class AbstractVaultCommand extends AbstractMetaTransactionCommand {
  protected declare input: VaultBalanceEntry;

  protected network: Network;

  protected constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);

    if (Array.isArray(input)) {
      throw new Error("Invalid input for command, Vault commands only accept one data as input.");
    }

    if (input.type !== BALANCE_TYPE.VAULT) {
      throw new Error("Invalid input for command, Vault commands only accept Vault balance type as input.");
    }

    this.network = sdk.getNetwork(input.networkSlug);

    if (!this.network.aggregatorContractAddress) {
      throw new Error("Aggregator contract address not found for network.");
    }
  }
}

export abstract class AbstractStealthAddressCommand extends AbstractMetaTransactionCommand {
  // SA address that will sign / auth. the action to be executed
  protected declare input: SaBalanceEntry;

  constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);

    if (Array.isArray(input)) {
      throw new Error("Invalid input for command, SA commands only accept one data as input.");
    }

    if (input.type !== BALANCE_TYPE.SA) {
      throw new Error("Invalid input for command, SA commands only accept SA balance type as input.");
    }

    this.network = sdk.getNetwork(input.networkSlug);
  }
}
