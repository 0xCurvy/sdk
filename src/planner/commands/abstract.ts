import type { ICurvySDK } from "@/interfaces/sdk";
import { type CurvyId, type CurvyPublicKeys, type HexString, isValidCurvyId, type Network } from "@/types";
import type { CommandData } from "../type";

export interface CommandEstimate {
  curvyFeeInCurrency: bigint;
  gasFeeInCurrency: bigint;
  bridgeFeeInCurrency?: bigint;
  bridgeEstimateAmount?: string;
}

export abstract class CurvyCommand {
  protected sdk: ICurvySDK;
  protected readonly input: CommandData;
  protected readonly senderCurvyId: CurvyId | null;
  protected readonly network: Network;

  public estimate?: CommandEstimate;

  readonly id: string;

  protected constructor(id: string, sdk: ICurvySDK, input: CommandData, estimate?: CommandEstimate) {
    this.id = id;
    this.sdk = sdk;
    this.input = input;
    this.estimate = estimate;
    this.senderCurvyId = sdk.walletManager.activeWallet.curvyHandle;

    if (Array.isArray(this.input)) {
      this.network = sdk.getNetwork(this.input[0].networkSlug);
    } else {
      this.network = sdk.getNetwork(this.input.networkSlug);
    }
  }

  abstract get recipient(): HexString | CurvyId | CurvyPublicKeys;
  abstract get name(): string;

  abstract estimateFees(): Promise<CommandEstimate>;
  abstract getResultingBalanceEntry(executionData?: unknown): Promise<CommandData | undefined>;

  abstract execute(): Promise<CommandData | undefined>;

  abstract get grossAmount(): bigint;
  get netAmount(): bigint {
    if (!this.estimate) {
      throw new Error("Command not estimated.");
    }

    const { curvyFeeInCurrency, gasFeeInCurrency } = this.estimate;

    return this.grossAmount - curvyFeeInCurrency - gasFeeInCurrency;
  }

  async generateNewNote(handleOrKeys: CurvyId | CurvyPublicKeys, token: bigint, amount: bigint) {
    let S: string, V: string, babyJubjubPublicKey: string;

    if (isValidCurvyId(handleOrKeys)) {
      const { data: recipientDetails } = await this.sdk.apiClient.user.ResolveCurvyId(handleOrKeys);

      if (!recipientDetails) {
        throw new Error(`Handle ${handleOrKeys} not found`);
      }

      if (!recipientDetails.publicKeys.babyJubjubPublicKey) {
        throw new Error(`BabyJubjub public key not found for handle ${handleOrKeys}`);
      }

      ({ spendingKey: S, viewingKey: V, babyJubjubPublicKey } = recipientDetails.publicKeys);
    } else {
      if (typeof handleOrKeys !== "object") {
        throw new Error(`Invalid handle or keys provided`);
      }

      ({ S, V, babyJubjubPublicKey } = handleOrKeys);
    }

    return this.sdk.core.sendNote(S, V, {
      ownerBabyJubjubPublicKey: babyJubjubPublicKey,
      amount,
      token,
    });
  }
}
