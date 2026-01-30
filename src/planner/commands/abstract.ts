import type { ICurvySDK } from "@/interfaces/sdk";
import { type CurvyHandle, type CurvyPublicKeys, type HexString, isValidCurvyHandle, type Network } from "@/types";
import type { CurvyCommandData } from "../plan";

export interface CurvyCommandEstimate {
  curvyFeeInCurrency: bigint;
  gasFeeInCurrency: bigint;
  bridgeFeeInCurrency?: bigint;
}

export abstract class CurvyCommand {
  protected sdk: ICurvySDK;
  protected readonly input: CurvyCommandData;
  protected readonly senderCurvyHandle: CurvyHandle | null;
  protected readonly network: Network;

  public estimate?: CurvyCommandEstimate;

  readonly id: string;

  protected constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    this.id = id;
    this.sdk = sdk;
    this.input = input;
    this.estimate = estimate;
    this.senderCurvyHandle = sdk.walletManager.activeWallet.curvyHandle;

    if (Array.isArray(this.input)) {
      this.network = sdk.getNetwork(this.input[0].networkSlug);
    } else {
      this.network = sdk.getNetwork(this.input.networkSlug);
    }
  }

  abstract get recipient(): HexString | CurvyHandle | CurvyPublicKeys;
  abstract get name(): string;

  abstract estimateFees(): Promise<CurvyCommandEstimate>;
  abstract getResultingBalanceEntry(executionData?: unknown): Promise<CurvyCommandData | undefined>;

  abstract execute(): Promise<CurvyCommandData | undefined>;

  abstract get grossAmount(): bigint;
  get netAmount(): bigint {
    if (!this.estimate) {
      throw new Error("Command not estimated.");
    }

    const { curvyFeeInCurrency, gasFeeInCurrency } = this.estimate;

    return this.grossAmount - curvyFeeInCurrency - gasFeeInCurrency;
  }

  async generateNewNote(handleOrKeys: CurvyHandle | CurvyPublicKeys, token: bigint, amount: bigint) {
    let S: string, V: string, babyJubjubPublicKey: string;

    if (isValidCurvyHandle(handleOrKeys)) {
      const { data: recipientDetails } = await this.sdk.apiClient.user.ResolveCurvyHandle(handleOrKeys);

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
