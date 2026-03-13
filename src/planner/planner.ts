import type { StorageInterface } from "@/interfaces";
import type { IBalanceScanner } from "@/interfaces/balance-scanner";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { ICommandFactory } from "@/planner/commands/factory";
import type {
  CurvyCommandData,
  CurvyIntent,
  CurvyPlan,
  CurvyPlanData,
  CurvyPlanEstimation,
  CurvyPlanExecution,
  CurvyPlanWait,
  DraftCommand,
  DraftPlan,
  EstimatedCommand,
  EstimatedPlan,
  IntentEstimation,
} from "@/planner/type";
import { generatePlan } from "@/planner/utils";
import type { BalanceEntry } from "@/types";
import { pollForCriteria } from "@/utils";
import { toSlug } from "@/utils/helpers";

// Internal types
type PlanWalkSuccessResult = {
  success: true;
  data?: CurvyCommandData;
  estimate?: CurvyCommandEstimate;
  estimatedPlan?: EstimatedPlan;
  items?: PlanWalkResult[];
};

type PlanWalkFailureResult = {
  success: false;
  error: unknown;
  items?: PlanWalkResult[];
};

type PlanWalkResult = PlanWalkSuccessResult | PlanWalkFailureResult;

type PlanNodeHandlers<C extends DraftCommand> = {
  command: (plan: C, input: CurvyCommandData) => Promise<PlanWalkResult>;
  data: (plan: CurvyPlanData, input?: CurvyCommandData) => Promise<PlanWalkResult>;
  wait: (plan: CurvyPlanWait, input?: CurvyCommandData) => Promise<PlanWalkResult>;
};

// Utility functions

function accumulateEstimate(target: CurvyCommandEstimate, source?: CurvyCommandEstimate): void {
  const { gasFeeInCurrency = 0n, curvyFeeInCurrency = 0n, bridgeFeeInCurrency = 0n } = source || {};
  target.gasFeeInCurrency += gasFeeInCurrency;
  target.curvyFeeInCurrency += curvyFeeInCurrency;
  if (bridgeFeeInCurrency)
    if (!target.bridgeFeeInCurrency) target.bridgeFeeInCurrency = bridgeFeeInCurrency;
    else target.bridgeFeeInCurrency += bridgeFeeInCurrency;
}

function mergeEstimates(results: PlanWalkResult[]): CurvyCommandEstimate {
  const merged: CurvyCommandEstimate = { gasFeeInCurrency: 0n, curvyFeeInCurrency: 0n };
  for (const result of results) {
    if (result.success) accumulateEstimate(merged, result.estimate);
  }
  return merged;
}

export class Planner {
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

  /**
   * Generic plan tree walker. Handles parallel/serial flow control uniformly,
   * delegating leaf nodes (command, data, wait) to the provided handlers.
   */
  async #walkPlan<C extends DraftCommand>(
    plan: CurvyPlan<C>,
    handlers: PlanNodeHandlers<C>,
    input?: CurvyCommandData,
  ): Promise<PlanWalkResult> {
    // Parallel flow control
    if (plan.type === "parallel") {
      const results = await Promise.all(plan.items.map((item) => this.#walkPlan(item, handlers, undefined)));
      const success = results.every((r) => r.success);

      this.eventEmitter.emitPlanExecutionProgress({
        plan,
        result: { success, items: results } as CurvyPlanExecution,
      });

      if (success) {
        const hasEstimatedPlans = results[0]?.estimatedPlan !== undefined;

        return {
          success: true,
          ...(hasEstimatedPlans && {
            estimatedPlan: {
              type: "parallel" as const,
              name: plan.name,
              description: plan.description,
              items: results.map((r) => r.estimatedPlan!),
            },
          }),
          items: results,
          estimate: mergeEstimates(results),
          data: results.filter((r) => r.data !== undefined).map((r) => r.data) as BalanceEntry[],
        };
      }

      return {
        success: false,
        items: results,
        error: results.filter((r) => !r.success).map((r) => (r as PlanWalkFailureResult).error),
      };
    }

    // Serial flow control
    if (plan.type === "serial") {
      const results: PlanWalkSuccessResult[] = [];

      if (plan.items.length === 0) {
        throw new Error("No items in serial node!");
      }

      let data = input;
      const estimate: CurvyCommandEstimate = { gasFeeInCurrency: 0n, curvyFeeInCurrency: 0n };

      for (const item of plan.items) {
        const result = await this.#walkPlan(item, handlers, data);
        if (!result.success) {
          return {
            success: false,
            error: result.error,
            items: results,
          };
        }

        results.push(result);

        accumulateEstimate(estimate, result.estimate);
        data = result.data;
      }

      const hasEstimatedPlans = results[0]?.estimatedPlan !== undefined;

      return {
        success: true,
        ...(hasEstimatedPlans && {
          estimatedPlan: {
            type: "serial" as const,
            name: plan.name,
            description: plan.description,
            items: results.map((r) => r.estimatedPlan!),
          },
        }),
        data,
        estimate,
        items: results,
      };
    }

    // Leaf nodes — delegate to handlers
    if (plan.type === "command") {
      if (!input) {
        throw new Error("Input is required for command node!");
      }
      return handlers.command(plan, input);
    }

    if (plan.type === "data") {
      return handlers.data(plan, input);
    }

    if (plan.type === "wait") {
      return handlers.wait(plan, input);
    }

    throw new Error(`Unrecognized type for plan node: ${(plan as CurvyPlan).type}`);
  }

  async #estimateRecursively(plan: DraftPlan, input?: CurvyCommandData): Promise<CurvyPlanEstimation> {
    return this.#walkPlan(
      plan,
      {
        command: async (node, nodeInput) => {
          try {
            const command = this.commandFactory.createCommand(node.id, node.name, nodeInput, node.intent);

            const estimate = await command.estimateFees();
            const data = await command.getResultingBalanceEntry();

            const estimatedCommand: EstimatedCommand = { ...node, estimate };

            return { success: true, estimatedPlan: estimatedCommand, estimate, data };
          } catch (error) {
            return { success: false, error };
          }
        },
        data: async (node) => {
          return { success: true, estimatedPlan: node, data: node.data };
        },
        wait: async (node, nodeInput) => {
          return { success: true, estimatedPlan: node, data: nodeInput };
        },
      },
      input,
    ) as Promise<CurvyPlanEstimation>;
  }

  async #executeRecursively(plan: EstimatedPlan, input?: CurvyCommandData): Promise<CurvyPlanExecution> {
    return this.#walkPlan(
      plan,
      {
        command: async (node, nodeInput) => {
          try {
            const command = this.commandFactory.createCommand(
              node.id,
              node.name,
              nodeInput,
              node.intent,
              node.estimate,
            );

            const data = await command.execute();

            await this.#storage.removeSpentBalanceEntries(Array.isArray(nodeInput) ? nodeInput : [nodeInput]);
            this.eventEmitter.emitPlanCommandExecutionProgress({ commandId: node.id });

            return { success: true, estimate: node.estimate, data };
          } catch (error) {
            return { success: false, error };
          }
        },
        data: async (node) => {
          return { success: true, data: node.data };
        },
        wait: async (node, nodeInput) => {
          try {
            await pollForCriteria(() => node.condition(), Boolean, 30, 10000);

            this.eventEmitter.emitPlanCommandExecutionProgress({ commandId: node.id });

            return { success: true, data: nodeInput };
          } catch {
            return {
              success: false,
              error: new Error(`Timeout: ${node.name} condition was not met within the expected time.`),
            };
          }
        },
      },
      input,
    ) as Promise<CurvyPlanExecution>;
  }

  // Public functions
  async execute(sdk: ICurvySDK, plan: EstimatedPlan): Promise<CurvyPlanExecution> {
    this.eventEmitter.emitPlanExecutionStarted({ plan });

    const activeWalletId = sdk.walletManager.activeWallet.id;

    this.#balanceScanner.pauseBalanceRefreshForWallet(activeWalletId);

    const result = await this.#executeRecursively(plan, undefined);

    this.#balanceScanner.resumeBalanceRefreshForWallet(activeWalletId);

    if (result.success) {
      this.eventEmitter.emitPlanExecutionComplete({ plan, result });
    } else {
      this.eventEmitter.emitPlanExecutionError({ plan, result });
    }

    if (!result.success) {
      console.error(result);
      throw result.error;
    }

    return result;
  }

  async estimate(
    sdk: ICurvySDK,
    intent: CurvyIntent,
    opts?: {
      balances?: BalanceEntry[];
    },
  ): Promise<IntentEstimation> {
    const balances =
      opts?.balances ??
      (await sdk.storage.getBalanceSources(
        sdk.walletManager.activeWallet.id,
        intent.currency.contractAddress,
        toSlug(intent.network.name),
      ));
    const { plan: draftPlan, usedBalances } = generatePlan(sdk, balances, intent);

    const result = await this.#estimateRecursively(draftPlan, undefined);

    if (!result.success) {
      console.error(`Plan estimation failed: ${result.error}`);
      throw result.error;
    }

    if (!result.data) {
      throw new Error("Estimation resulted in no data, expected a single BalanceEntry.");
    }

    if (Array.isArray(result.data)) {
      throw new Error("Estimation resulted in multiple data entries, expected a single BalanceEntry.");
    }

    if (!result.estimate) {
      throw new Error("Estimation resulted in no estimate data.");
    }

    return {
      plan: result.estimatedPlan,
      usedBalances,
      gas: result.estimate.gasFeeInCurrency,
      curvyFee: result.estimate.curvyFeeInCurrency,
      bridgeFee: result.estimate.bridgeFeeInCurrency,
      effectiveAmount: result.data.balance,
    };
  }
}
