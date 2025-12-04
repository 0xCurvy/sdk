import { privateKeyToAccount } from "viem/accounts";
import { vaultV1Abi } from "@/contracts/evm/abi";
import type { ICurvySDK } from "@/interfaces/sdk";
import { VaultWithdrawToEOACommand } from "@/planner/commands";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import {
  BALANCE_TYPE,
  type BalanceEntry,
  type HexString,
  META_TRANSACTION_NUMERIC_TYPES,
  META_TRANSACTION_TYPES,
  type MetaTransactionType,
  type SaBalanceEntry,
  type VaultBalanceEntry,
} from "@/types";
import type { DeepNonNullable } from "@/types/helper";

export interface MetaTransactionCommandEstimate extends CurvyCommandEstimate {
  sharedSecret?: bigint;
  estimateId: string;
}

const FEE_DENOMINATOR = 10_000n;

abstract class AbstractMetaTransactionCommand extends CurvyCommand {
  declare input: DeepNonNullable<BalanceEntry>;
  declare estimate: MetaTransactionCommandEstimate;

  protected constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);
    this.validateInput(this.input);
  }

  protected abstract get metaTransactionType(): MetaTransactionType;

  get grossAmount() {
    return this.input.balance;
  }

  #getToAddress(): HexString {
    switch (this.metaTransactionType) {
      case META_TRANSACTION_TYPES.VAULT_WITHDRAW: {
        if (!(this instanceof VaultWithdrawToEOACommand)) {
          throw new Error("Invalid command type for meta transaction type VAULT_WITHDRAW");
        }

        return this.intent.toAddress as HexString;
      }
      default:
        return this.network.aggregatorContractAddress as HexString;
    }
  }

  protected validateInput(input: CurvyCommandData): asserts input is SaBalanceEntry | VaultBalanceEntry {
    if (Array.isArray(input)) {
      throw new Error("Invalid input for command, meta transaction commands only accept single data  input.");
    }
    if (!input.vaultTokenId) {
      throw new Error("Invalid input for command, vaultTokenId is required.");
    }
  }

  protected async signMetaTransaction(to?: HexString) {
    if (!this.estimate) {
      throw new Error("Command not estimated.");
    }

    const rpc = this.sdk.rpcClient.Network(this.network.name);
    const privateKey = await this.sdk.walletManager.getAddressPrivateKey(this.input.source);

    const nonce = await rpc.provider.readContract({
      abi: vaultV1Abi,
      address: this.network.vaultContractAddress as HexString,
      functionName: "getNonce",
      args: [this.input.source as HexString],
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
        to: to ?? this.#getToAddress(),
        tokenId: this.input.vaultTokenId,
        amount: this.input.balance,
        gasFee: this.estimate.gasFeeInCurrency,
        metaTransactionType: META_TRANSACTION_NUMERIC_TYPES[this.metaTransactionType],
      },
    });
  }

  protected async calculateCurvyFee(): Promise<bigint> {
    const rpc = this.sdk.rpcClient.Network(this.network.name);

    const mapMetaTransactionTypeToFeeVariableName = {
      [META_TRANSACTION_TYPES.VAULT_WITHDRAW]: "withdrawalFee",
      [META_TRANSACTION_TYPES.VAULT_TRANSFER]: "transferFee",
      [META_TRANSACTION_TYPES.VAULT_DEPOSIT_TO_AGGREGATOR]: "transferFee",
      [META_TRANSACTION_TYPES.VAULT_ONBOARD]: "depositFee",
    } as const;

    const metaTransactionType = this.metaTransactionType;

    if (!(metaTransactionType in mapMetaTransactionTypeToFeeVariableName)) {
      throw new Error(`Meta transaction type ${this.metaTransactionType} is not supported.`);
    }

    const fee = await rpc.provider.readContract({
      abi: vaultV1Abi,
      address: this.network.vaultContractAddress as HexString,
      functionName: mapMetaTransactionTypeToFeeVariableName[metaTransactionType],
      args: [],
    });

    return (this.input.balance * fee) / FEE_DENOMINATOR;
  }

  protected async calculateGasFee(ownerHash?: bigint) {
    return this.sdk.apiClient.metaTransaction.EstimateGas({
      type: this.metaTransactionType,
      currencyAddress: this.input.currencyAddress,
      amount: this.input.balance.toString(),
      fromAddress: this.input.source,
      toAddress: this.#getToAddress(),
      network: this.input.networkSlug,
      ownerHash: ownerHash ? `0x${ownerHash.toString(16)}` : undefined,
    });
  }

  async estimateFees(): Promise<MetaTransactionCommandEstimate> {
    const { gasFeeInCurrency, id: estimateId } = await this.calculateGasFee();
    const curvyFeeInCurrency = await this.calculateCurvyFee();

    return { gasFeeInCurrency, estimateId, curvyFeeInCurrency };
  }
}

export abstract class AbstractVaultMetaTransactionCommand extends AbstractMetaTransactionCommand {
  declare input: DeepNonNullable<VaultBalanceEntry>;
  declare estimate: MetaTransactionCommandEstimate;

  constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);
    this.validateInput(this.input);
  }

  protected override validateInput(input: BalanceEntry): asserts input is VaultBalanceEntry {
    if (input.type !== BALANCE_TYPE.VAULT)
      throw new Error(
        "Invalid input for command, VaultMetaTransaction commands only accept Vault balance entry as input.",
      );
  }
}

export abstract class AbstractSaMetaTransactionCommand extends AbstractMetaTransactionCommand {
  declare input: DeepNonNullable<SaBalanceEntry>;

  constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);
    this.validateInput(this.input);
  }

  protected override validateInput(input: BalanceEntry): asserts input is VaultBalanceEntry {
    if (input.type !== BALANCE_TYPE.SA)
      throw new Error("Invalid input for command, SaMetaTransaction commands only accept Sa balance entry as input.");
  }
}
