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
    currentAction: string,
    params: any
  ): SBAction[] {
    const actionOrder = ["aggregate", "deposit", "csuc"];
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

    const currentSequence = builder.schedule();
    if (currentSequence.isExecutable) {
      return currentSequence.actions;
    }

    const nextAction = actionOrder[actionOrder.indexOf(currentAction) + 1];
    
    subSequence = this.computeSequence(currentState, nextAction, {
      targetAmount: currentSequence.remainingAmount,
      token: params.targetToken,
      recipientPublicKey: params.recipientPublicKey,
      recipientBabyJubJubPublicKey: params.recipientBabyJubJubPublicKey,
    });

    if (subSequence.length > 0) {
      const repeatedSequence = builder.schedule();
      return [...subSequence, ...repeatedSequence.actions];
    }
    return [];
  }

  build(
    amount: bigint,
    token: bigint,
    recipientPublicKey: string,
    recipientBabyJubJubPublicKey: string,
    targetAction: 'aggregate' | 'deposit' | 'csuc' = 'aggregate'
  ): SBSequence {
    const sequence = this.computeSequence(this.state, targetAction, {
      targetAmount: amount,
      token,
      recipientPublicKey,
      recipientBabyJubJubPublicKey,
    });

    return {
      type: "serial",
      actions: sequence,
    };
  }
}
