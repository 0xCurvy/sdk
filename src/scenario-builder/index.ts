import type { SBAction, SBState, SBSequence } from "@/types/scenario-builder";
import { AggregateAction } from "./actions/aggregate";
import { DepositAction } from "./actions/deposit";
import { CsucDepositAction } from "./actions/csuc-deposit";

export class ScenarioBuilder {
  private state: SBState;

  constructor(state: SBState) {
    this.state = state;
  }

  computeSequence(
    currentState: SBState,
    currentAction: string, // Current action je zapravo prosledjen target iz build metode
    params: any // Da li je params zapravo CurvyIntent? Jeste
  ): SBAction[] {
    const actionOrder = ["aggregate", "deposit", "csuc"]; // akcije su sustinski nivoi
    const actionBuilders: any = {
      // TODO: Set type
      aggregate: AggregateAction,
      deposit: DepositAction,
      csuc: CsucDepositAction,
    };

    if (actionBuilders[currentAction] == undefined) {
      throw new Error(`Action ${currentAction} not supported`);
    }

    const builder = new actionBuilders[currentAction](currentState, params);

    let subSequence: SBAction[];

    let currentSequence: any; //  TODO: Define type

    currentSequence = builder.schedule();

    // isExecutable ce biti false u slucaju agregatora ako
    // smo videli da ukupni noteovi ne mogu da ispune target amount

    // isExecutable ce biti false u slucaju CSUC ako
    // smo videli da ukupni csuc balansi ne mogu da ispune target amount

    // currentSequence.actions je sustinski plan koji je vratio ovaj konkretan nivo
    if (currentSequence.isExecutable) {
      return currentSequence.actions;
    }

    // ovde recimo prelazimo sa Aggregatora na CSUC jer nam je zafalilo
    // todo: proveri da li uopste postoji next action
    const nextAction = actionOrder[actionOrder.indexOf(currentAction) + 1];

    // pokreni novu sekvencu, po next action (e.g. csuc ako je aggregator zakazao)
    //  currentState se mutira non stop kroz sve slojeve, sve je ionako single threaded
    subSequence = this.computeSequence(currentState, nextAction, {
      targetAmount: currentSequence.remainingAmount, // koliko je ostalo od agregatora, odnosno koliko fali na agregatoru
      token: params.targetToken,
      recipientPublicKey: params.recipientPublicKey,
      recipientBabyJubJubPublicKey: params.recipientBabyJubJubPublicKey,
    });

    // ako sledeci sequence nije imao nikakve akcije, nema nam pomoci
    // a ako jeste onda prependuj iz nizeg nivoa u visi
    if (subSequence.length > 0) {
      const repeatedSequence = builder.schedule();
      return [...subSequence, ...repeatedSequence.actions];
    }

    return [];
  }

  // BUILD je wrappper oko compiute sequnence koji samo na kraju stavi sve u serial parenta
  build(
    amount: bigint,
    token: bigint,
    recipientPublicKey: string,
    recipientBabyJubJubPublicKey: string,
    targetAction: 'aggregate' | 'deposit' | 'csuc' = 'aggregate'
  ): SBSequence {
    const sequence = this.computeSequence(this.state, targetAction, {
      targetAmount: amount,
      targetToken: token,
      recipientPublicKey,
      recipientBabyJubJubPublicKey,
    });

    return {
      type: "serial",
      actions: sequence,
    };
  }
}
