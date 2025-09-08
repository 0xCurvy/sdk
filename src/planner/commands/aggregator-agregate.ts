import type { AggregatorRequestStatusValuesType } from "@/exports";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandData } from "@/planner/addresses/abstract";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyIntent } from "@/planner/plan";

export class AgregatorAgregateCommand extends CurvyCommand {
  sdk: ICurvySDK;
  constructor(input: CurvyCommandData, intent: CurvyIntent, sdk: ICurvySDK) {
    // TODO: Slobodno ovde dodaj check da kao input moras da dobijes niz CurvyCommandAddress i da svaki element u tom nizu mora da bude type==="note"
    super(input);
    this.sdk = sdk;
  }

  async execute(): Promise<CurvyCommandData> {
    // TODO:  Payload ti ovde nije dobar
    //   nisi dobro struktuirao ulazni argument koji je Params koji se sastoji od input i output noteova, ovo sto je this.input su samo input Noteovi
    //   outpuut notove nisi definisao a njih trebas da definises tako sto
    //   ces da proveris da li je suma input noteova veca od amounta prosledjenog u ovu komandu (pogledaj parent granu vidi da ova komanda prima i amount argument)
    //   ako je suma veca, onda ces umesto dummy nota da pravis change note kao output koji tebi vraca pare
    //   ako je suma jednaga, onda ces praviti drugi output note kao dummy note

    // TODO: takodje da bi mogao da prosledis inputNoteove iz CurvyCommandData, napravi getter za note u ovoj klasi: https://github.com/0xCurvy/curvy-monorepo/blob/experiment/command-pattern/packages/sdk/src/planner/addresses/note.ts
    //@ts-expect-error
    const payload = this.sdk.createAggregationPayload(this.input);

    const apiClient = this.sdk.getApiClient;

    const requestId = await apiClient.aggregator.SubmitAggregation(payload);

    await this.sdk.pollForCriteria(
      () => apiClient.aggregator.GetAggregatorRequestStatus(requestId.requestId),
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
