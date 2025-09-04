import type { SBAction, SBState, SBSequence } from "@/types/scenario-builder";
import { AggregateAction } from "./actions/aggregate";

export class ScenarioBuilder {
  private state: SBState;

  constructor(state: SBState) {
    this.state = state;
  }

  computeSequence(currentState: SBState, currentAction: string, params: any): SBAction[] {
    let res: any;
    switch (currentAction) {
      case "aggregate":
        res = new AggregateAction(currentState, params).schedule();
        return res.actions;
    }
    return [];
  }

  build(
    amount: bigint,
    recipientPublicKey: string,
    recipientBabyJubJubPublicKey: string,
  ): SBSequence {
    const sequence = this.computeSequence(
        this.state, "build", {
            targetAmount:amount,
            recipientPublicKey,
            recipientBabyJubJubPublicKey,
        });

    return {
      type: "serial",
      actions: sequence,
    };
  }
}
