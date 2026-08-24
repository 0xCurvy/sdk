import type { CommandKind, DraftCommand, Plan, PlanStep } from "@/planner/types";

const commandLabel = (kind: CommandKind): string => {
  switch (kind) {
    case "aggregator-aggregate":
      return "Aggregate funds";
    case "aggregator-withdraw":
      return "Withdraw funds";
  }
};

/** Return the ordered, sanitized steps an integrator can present to a user. */
export function getPlanSteps<C extends DraftCommand>(plan: Plan<C>): PlanStep[] {
  const pending: Array<Omit<PlanStep, "index" | "total">> = [];
  const visit = (node: Plan<C>): void => {
    if (node.type === "serial" || node.type === "parallel") {
      for (const child of node.items) visit(child);
      return;
    }
    if (node.type === "command") {
      pending.push({ id: node.id, kind: node.kind, label: commandLabel(node.kind) });
      return;
    }
    if (node.type === "wait") pending.push({ id: node.id, kind: "wait", label: node.name });
  };
  visit(plan);
  return pending.map((step, index) => ({ ...step, index, total: pending.length }));
}
