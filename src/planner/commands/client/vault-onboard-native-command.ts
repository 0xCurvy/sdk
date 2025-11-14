import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { BALANCE_TYPE, type HexString, type SaBalanceEntry, type VaultBalanceEntry } from "@/types";

interface VaultOnboardNativeCommandEstimate extends CurvyCommandEstimate {
  data: VaultBalanceEntry;
  maxFeePerGas: bigint;
  gasLimit: bigint;
}

// TODO: Move to config, even better read from RPC
const DEPOSIT_TO_VAULT_FEE = 1;

export class VaultOnboardNativeCommand extends CurvyCommand {
  declare input: SaBalanceEntry;
  declare estimateData: VaultOnboardNativeCommandEstimate | undefined;

  constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);

    this.validateInput(this.input);
  }

  get name(): string {
    return "VaultOnboardNativeCommand";
  }

  getNetAmount(): bigint {
    if (!this.estimateData) {
      throw new Error("[VaultOnboardNativeCommand] Command must be estimated before calculating net amount!");
    }
    return this.input.balance - this.estimateData.gasFeeInCurrency - this.estimateData.curvyFeeInCurrency;
  }

  validateInput(input: CurvyCommandData): asserts input is SaBalanceEntry {
    if (Array.isArray(input)) {
      throw new Error("Invalid input for command, SA commands only accept one data as input.");
    }

    if (input.type !== BALANCE_TYPE.SA) {
      throw new Error("Invalid input for command, SA commands only accept SA balance type as input.");
    }
  }

  async #estimateGas() {
    const { maxFeePerGas, gasLimit } = await this.rpc.estimateOnboardNativeToVault(
      this.input.source as HexString,
      this.input.balance,
    );

    return { maxFeePerGas, gasLimit };
  }

  protected calculateCurvyFee(gasFeeInCurrency: bigint): bigint {
    return ((this.input.balance - gasFeeInCurrency) * BigInt(DEPOSIT_TO_VAULT_FEE)) / 1000n;
  }
  protected async calculateGasFee(maxFeePerGas: bigint, gasLimit: bigint): Promise<bigint> {
    return (maxFeePerGas * gasLimit * 120n) / 100n;
  }

  async getResultingBalanceEntry(estimationParams?: {
    gasFeeInCurrency?: bigint;
    curvyFeeInCurrency?: bigint;
  }): Promise<VaultBalanceEntry> {
    const { vaultTokenId } =
      this.network.currencies.find((c) => c.contractAddress === this.input.currencyAddress) || {};

    if (!vaultTokenId) {
      throw new Error(
        `[VaultOnboardNativeCommand] vaultTokenId is not defined for currency ${this.input.currencyAddress} on network ${this.input.networkSlug}`,
      );
    }

    const { createdAt: _, ...inputData } = this.input;

    const _gasFeeInCurrency = estimationParams?.gasFeeInCurrency ?? this.estimateData?.curvyFeeInCurrency;
    const _curvyFeeInCurrency = estimationParams?.curvyFeeInCurrency ?? this.estimateData?.curvyFeeInCurrency;

    if (_gasFeeInCurrency === undefined || _curvyFeeInCurrency === undefined) {
      throw new Error(
        "[VaultOnboardNativeCommand] gasFeeInCurrency and curvyFeeInCurrency are required to get resulting balance entry!",
      );
    }

    return {
      ...inputData,
      vaultTokenId: BigInt(vaultTokenId),
      balance: inputData.balance - _gasFeeInCurrency - _curvyFeeInCurrency,
      type: BALANCE_TYPE.VAULT,
    } satisfies VaultBalanceEntry;
  }

  async execute(): Promise<CurvyCommandData> {
    if (!this.estimateData) {
      throw new Error("[SaVaultOnboardNativeCommand] Command must be estimated before execution!");
    }

    const privateKey = await this.sdk.walletManager.getAddressPrivateKey(this.input.source);

    const { gasLimit, maxFeePerGas } = this.estimateData;
    await this.rpc.onboardNativeToVault(this.getNetAmount(), privateKey, maxFeePerGas!, gasLimit!);

    return this.getResultingBalanceEntry();
  }

  async estimate(): Promise<VaultOnboardNativeCommandEstimate> {
    const { maxFeePerGas, gasLimit } = await this.#estimateGas();
    const gasFeeInCurrency = await this.calculateGasFee(maxFeePerGas, gasLimit);
    const curvyFeeInCurrency = this.calculateCurvyFee(gasFeeInCurrency);

    const vaultBalanceEntry = await this.getResultingBalanceEntry({ gasFeeInCurrency, curvyFeeInCurrency });

    return {
      curvyFeeInCurrency,
      gasFeeInCurrency,
      data: vaultBalanceEntry,
      maxFeePerGas,
      gasLimit,
    };
  }
}
