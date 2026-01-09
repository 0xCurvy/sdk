import { privateKeyToAccount } from "viem/accounts";
import { vaultAbi } from "@/contracts/evm/abi";
import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { EvmRpc } from "@/rpc";
import {
  type CurvyHandle,
  type HexString,
  isSaBalanceEntry,
  isVaultBalanceEntry,
  META_TRANSACTION_NUMERIC_TYPES,
  META_TRANSACTION_TYPES,
  type MetaTransactionType,
  type Note,
  type SaBalanceEntry,
  type VaultBalanceEntry,
} from "@/types";
import type { DeepNonNullable } from "@/types/helper";

export interface MetaTransactionCommandEstimate extends CurvyCommandEstimate {
  estimateId: string;
}

export interface MetaTransactionCommandEstimateWithNote extends MetaTransactionCommandEstimate {
  note: Note;
}

const FEE_DENOMINATOR = 10_000n;

abstract class AbstractMetaTransactionCommand extends CurvyCommand {
  declare input: DeepNonNullable<SaBalanceEntry | VaultBalanceEntry>;
  declare estimate: MetaTransactionCommandEstimate;
  protected declare senderCurvyHandle: CurvyHandle;
  protected readonly rpc: EvmRpc;

  protected constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);

    if (Array.isArray(input)) {
      throw new Error("Invalid input for command, meta transaction commands only accept single data  input.");
    }
    if (!input.vaultTokenId) {
      throw new Error("Invalid input for command, vaultTokenId is required.");
    }
    if (!this.senderCurvyHandle) {
      throw new Error("Active wallet must have a Curvy Handle to perform meta transactions.");
    }

    const rpc = sdk.rpcClient.Network(this.network.id);

    if (!(rpc instanceof EvmRpc)) {
      throw new Error("AbstractMetaTransactionCommand only supports EVM networks.");
    }

    this.rpc = rpc;
  }

  protected abstract get metaTransactionType(): MetaTransactionType;

  get grossAmount() {
    return this.input.balance;
  }

  override get recipient(): HexString {
    return this.network.aggregatorContractAddress as HexString;
  }

  protected async signMetaTransaction(to?: HexString) {
    if (!this.estimate) {
      throw new Error("Command not estimated.");
    }

    const privateKey = await this.sdk.walletManager.getAddressPrivateKey(this.input.source);

    const nonce = await this.rpc.provider.readContract({
      abi: vaultAbi,
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
        to: to ?? this.recipient,
        tokenId: this.input.vaultTokenId,
        amount: this.input.balance,
        gasFee: this.estimate.gasFeeInCurrency,
        metaTransactionType: META_TRANSACTION_NUMERIC_TYPES[this.metaTransactionType],
      },
    });
  }

  protected async calculateCurvyFee(): Promise<bigint> {
    const mapMetaTransactionTypeToFeeVariableName = {
      [META_TRANSACTION_TYPES.VAULT_WITHDRAW]: "withdrawalFee",
      [META_TRANSACTION_TYPES.VAULT_TRANSFER]: "transferFee",
      [META_TRANSACTION_TYPES.VAULT_DEPOSIT_TO_AGGREGATOR]: "transferFee",
      [META_TRANSACTION_TYPES.VAULT_ONBOARD]: "depositFee",
    } as const;

    const metaTransactionType = this.metaTransactionType;

    if (
      metaTransactionType === META_TRANSACTION_TYPES.EXIT_BRIDGE ||
      metaTransactionType === META_TRANSACTION_TYPES.LEGACY_PORTAL
    ) {
      return 0n;
    }

    if (!(metaTransactionType in mapMetaTransactionTypeToFeeVariableName)) {
      throw new Error(`Meta transaction type ${this.metaTransactionType} is not supported.`);
    }

    const fee = await this.rpc.provider.readContract({
      abi: vaultAbi,
      address: this.network.vaultContractAddress as HexString,
      functionName: mapMetaTransactionTypeToFeeVariableName[metaTransactionType],
      args: [],
    });

    return (this.input.balance * fee) / FEE_DENOMINATOR;
  }

  protected async calculateGasFee(args: { ownerHash?: bigint; exitNetwork?: string } = {}) {
    return this.sdk.apiClient.metaTransaction.EstimateGas({
      type: this.metaTransactionType,
      currencyAddress: this.input.currencyAddress,
      amount: this.input.balance.toString(),
      fromAddress: this.input.source,
      toAddress: this.recipient,
      network: this.input.networkSlug,
      ownerHash: args.ownerHash ? `0x${args.ownerHash.toString(16)}` : undefined,
      exitNetwork: args.exitNetwork,
    });
  }

  async estimateFees(): Promise<MetaTransactionCommandEstimate> {
    const { gasFeeInCurrency, id: estimateId } = await this.calculateGasFee();
    const curvyFeeInCurrency = await this.calculateCurvyFee();

    this.estimate = { gasFeeInCurrency, estimateId, curvyFeeInCurrency };

    return this.estimate;
  }
}

export abstract class AbstractVaultMetaTransactionCommand extends AbstractMetaTransactionCommand {
  declare input: DeepNonNullable<VaultBalanceEntry>;
  declare estimate: MetaTransactionCommandEstimate;

  constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    if (Array.isArray(input) || !isVaultBalanceEntry(input)) {
      throw new Error(
        "Invalid input for command, VaultMetaTransaction commands only accept Vault balance entry as input.",
      );
    }

    super(id, sdk, input, estimate);
  }
}

export abstract class AbstractSaMetaTransactionCommand extends AbstractMetaTransactionCommand {
  declare input: DeepNonNullable<SaBalanceEntry>;

  constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    if (Array.isArray(input) || !isSaBalanceEntry(input)) {
      throw new Error("Invalid input for command, SaMetaTransaction commands only accept Sa balance entry as input.");
    }

    super(id, sdk, input, estimate);
  }
}
