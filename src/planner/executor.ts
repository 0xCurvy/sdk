import type { StorageInterface } from "@/interfaces";
import type { IBalanceScanner } from "@/interfaces/balance-scanner";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { ICommandFactory } from "@/planner/commands/factory";
import type {
  CurvyCommandData,
  CurvyPlan,
  CurvyPlanExecution,
  CurvyPlanSuccessfulExecution,
  CurvyPlanUnsuccessfulExecution,
} from "@/planner/plan";
import type { BalanceEntry } from "@/types";

export class CommandExecutor {
  private commandFactory: ICommandFactory;
  private eventEmitter: ICurvyEventEmitter;
  readonly #balanceScanner: IBalanceScanner;
  readonly #storage: StorageInterface;

  constructor(
    commandFactory: ICommandFactory,
    eventEmitter: ICurvyEventEmitter,
    balanceScanner: IBalanceScanner,
    storage: StorageInterface,
  ) {
    this.commandFactory = commandFactory;
    this.eventEmitter = eventEmitter;
    this.#balanceScanner = balanceScanner;
    this.#storage = storage;
  }

  async #walkRecursively(plan: CurvyPlan, input?: CurvyCommandData, dryRun?: boolean): Promise<CurvyPlanExecution> {
    // CurvyPlanFlowControl, parallel
    if (plan.type === "parallel") {
      // Parallel plans don't take any input,
      // because that would mean that each of its children is getting the same Address as input
      const result = await Promise.all(plan.items.map((item) => this.#walkRecursively(item, undefined, dryRun)));
      const success = result.every((r) => r.success);

      this.eventEmitter.emitPlanExecutionProgress({ plan, result: { success, items: result } as CurvyPlanExecution });

      if (success) {
        return {
          success: true,
          items: result,
          estimate: result.reduce<{ estimate: CurvyCommandEstimate }>(
            (res, { estimate }) => {
              res.estimate.gasFeeInCurrency += estimate?.gasFeeInCurrency || 0n;
              res.estimate.curvyFeeInCurrency += estimate?.curvyFeeInCurrency || 0n;

              if (estimate?.bridgeFeeInCurrency)
                res.estimate.bridgeFeeInCurrency = res.estimate.bridgeFeeInCurrency
                  ? res.estimate.bridgeFeeInCurrency + estimate.bridgeFeeInCurrency
                  : estimate.bridgeFeeInCurrency;

              return res;
            },
            { estimate: { gasFeeInCurrency: 0n, curvyFeeInCurrency: 0n } },
          ).estimate,
          data: result.filter((r) => r.success && r.data !== undefined).map((r) => r.data) as BalanceEntry[],
        };
      }

      return {
        success: false,
        items: result,
        error: result.filter((r) => !r.success).map((r) => r.error),
      };
    }

    // CurvyPlanFlowControl, serial
    if (plan.type === "serial") {
      const results: CurvyPlanExecution[] = [];

      if (plan.items.length === 0) {
        throw new Error("No items in serial node!");
      }

      let data = input;
      const estimate: CurvyCommandEstimate = { gasFeeInCurrency: 0n, curvyFeeInCurrency: 0n };
      for (const item of plan.items) {
        const result = await this.#walkRecursively(item, data, dryRun);

        results.push(result);

        // If latest item is unsuccessful, fail entire serial flow node with that error.
        if (!result.success) {
          return <CurvyPlanUnsuccessfulExecution>{
            success: false,
            error: result.error,
            items: results,
          };
        }

        // Set the output of current as data of next step
        data = result.data;
        estimate.gasFeeInCurrency += result.estimate?.gasFeeInCurrency || 0n;
        estimate.curvyFeeInCurrency += result.estimate?.curvyFeeInCurrency || 0n;

        if (result.estimate?.bridgeFeeInCurrency)
          estimate.bridgeFeeInCurrency = estimate.bridgeFeeInCurrency
            ? estimate.bridgeFeeInCurrency + result.estimate.bridgeFeeInCurrency
            : result.estimate.bridgeFeeInCurrency;
      }

      // The output address of the successful serial flow is the last members address.
      return <CurvyPlanSuccessfulExecution>{
        success: true,
        data,
        estimate,
        items: results, // TODO: I don't think this is needed
      };
    }

    // CurvyPlanCommand
    if (plan.type === "command") {
      if (!input) {
        throw new Error("Input is required for command node!");
      }

      try {
        const command = this.commandFactory.createCommand(plan.id, plan.name, input, plan.intent, plan.estimate);
        let data: CurvyCommandData | undefined;

        if (!dryRun) {
          data = await command.execute();

          await this.#storage.removeSpentBalanceEntries(Array.isArray(input) ? input : [input]);

          this.eventEmitter.emitPlanCommandExecutionProgress({ commandId: plan.id });
        } else {
          // Not great, but a WAAAAY simpler solution :)
          await command.estimateFees();
          data = await command.getResultingBalanceEntry();
          plan.estimate = command.estimate;
        }

        return <CurvyPlanSuccessfulExecution>{
          success: true,
          estimate: plan.estimate,
          data,
        };
      } catch (error) {
        return <CurvyPlanUnsuccessfulExecution>{
          success: false,
          error,
        };
      }
    }

    // CurvyPlanData
    if (plan.type === "data") {
      return <CurvyPlanSuccessfulExecution>{
        success: true,
        data: plan.data,
      };
    }

    throw new Error(`Unrecognized type for plan node: ${plan.type}`);
  }

  async executePlan(
    plan: CurvyPlan,
    options?: {
      walletId?: string;
    },
  ): Promise<CurvyPlanExecution> {
    this.eventEmitter.emitPlanExecutionStarted({ plan });

    this.#balanceScanner.pauseBalanceRefreshForWallet(options?.walletId);

    const result = await this.#walkRecursively(plan, undefined, false);

    this.#balanceScanner.resumeBalanceRefreshForWallet(options?.walletId);

    // TODO Refresh used balances

    if (result.success) {
      this.eventEmitter.emitPlanExecutionComplete({ plan, result });
    } else {
      this.eventEmitter.emitPlanExecutionError({ plan, result });
    }

    return result;
  }

  async estimatePlan(_plan: CurvyPlan): Promise<{
    plan: CurvyPlan;
    gas: bigint;
    curvyFee: bigint;
    effectiveAmount: bigint;
    bridgeFee: bigint | undefined;
  }> {
    const plan = structuredClone(_plan);

    const planEstimation = await this.#walkRecursively(plan, undefined, true);

    if (!planEstimation.success) {
      throw new Error(`Estimation failed: ${planEstimation.error}`);
    }

    if (!planEstimation.data) {
      throw new Error("Estimation resulted in no data, expected a single BalanceEntry.");
    }

    if (Array.isArray(planEstimation.data)) {
      throw new Error("Estimation resulted in multiple data entries, expected a single BalanceEntry.");
    }

    if (!planEstimation.estimate) {
      throw new Error("Estimation resulted in no estimate data.");
    }

    return {
      plan,
      gas: planEstimation.estimate.gasFeeInCurrency,
      curvyFee: planEstimation.estimate.curvyFeeInCurrency,
      bridgeFee: planEstimation.estimate.bridgeFeeInCurrency,
      effectiveAmount: planEstimation.data.balance,
    };
  }
}
