import type { AggregatorRequestStatusValuesType } from "@/exports";
import type { IApiClient } from "@/interfaces/api";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandData } from "@/planner/addresses/abstract";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyIntent } from "@/planner/plan";

export class AgregatorAgregateCommand extends CurvyCommand {
  apiClient: IApiClient;
  sdk: ICurvySDK;
  constructor(input: CurvyCommandData, intent: CurvyIntent, apiClient: IApiClient, sdk: ICurvySDK) {
    super(input);
    this.apiClient = apiClient;
    this.sdk = sdk;
  }

  async execute(): Promise<CurvyCommandData> {
    //@ts-expect-error
    const payload = this.sdk.createAggregationPayload(this.input);

    const requestId = await this.apiClient.aggregator.SubmitAggregation(payload);

    await this.sdk.pollForCriteria(
      () => this.apiClient.aggregator.GetAggregatorRequestStatus(requestId.requestId),
      (res: { status: AggregatorRequestStatusValuesType }) => {
        if (res.status === "failed") {
          throw new Error(`Aggregator withdraw ${res.status}`);
        }
        return res.status === "completed";
      },
      120,
      10_000,
    );

    // @ts-expect-error
    return Promise.resolve(payload.outputNotes);
  }

  estimate(): Promise<CurvyCommandEstimate> {
    // @ts-expect-error
    return Promise.resolve(undefined);
  }
}
