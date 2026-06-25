import type { CommandEstimate, DraftPlan } from "@/planner/types";
import type { BalanceEntry } from "@/types";

function describeData(data: BalanceEntry | BalanceEntry[]): string {
  const entries = Array.isArray(data) ? data : [data];
  if (entries.length === 1) {
    const e = entries[0];
    return `${e.symbol} ${e.balance} (${e.networkSlug})`;
  }
  const total = entries.reduce((sum, e) => sum + e.balance, 0n);
  return `${entries.length} notes, total ${total}`;
}

function nodeLabel(node: DraftPlan): string {
  switch (node.type) {
    case "serial":
    case "parallel":
      return node.name ? `${node.type} (${node.name})` : node.type;
    case "data":
      return `data: ${describeData(node.data)}`;
    case "wait":
      return `wait: ${node.name}`;
    case "command": {
      let label = `command: ${node.name}`;
      if (node.intent) label += ` → ${node.intent.type}`;
      // EstimatedPlan nodes carry an estimate; DraftPlan nodes do not.
      const estimate = (node as { estimate?: CommandEstimate }).estimate;
      if (estimate) label += ` [fee ${estimate.curvyFeeInCurrency} + gas ${estimate.gasFeeInCurrency}]`;
      return label;
    }
  }
}

function nodeChildren(node: DraftPlan): DraftPlan[] {
  return node.type === "serial" || node.type === "parallel" ? node.items : [];
}

/**
 * Render a plan tree as a human-readable ASCII tree, for debugging and logs.
 * Accepts a {@link DraftPlan} or an `EstimatedPlan` (estimates are annotated
 * on command nodes when present).
 *
 * @example
 * console.log(describePlan(plan));
 * // serial
 * // ├─ data: USDC 1000 (ethereum)
 * // ├─ command: aggregator-withdraw → external-transfer
 * // └─ wait: Confirming delivery
 */
export function describePlan(plan: DraftPlan): string {
  const lines: string[] = [];

  const walk = (node: DraftPlan, prefix: string, isLast: boolean, isRoot: boolean): void => {
    lines.push(isRoot ? nodeLabel(node) : `${prefix}${isLast ? "└─ " : "├─ "}${nodeLabel(node)}`);

    const children = nodeChildren(node);
    const childPrefix = isRoot ? "" : `${prefix}${isLast ? "   " : "│  "}`;
    children.forEach((child, i) => {
      walk(child, childPrefix, i === children.length - 1, false);
    });
  };

  walk(plan, "", true, true);
  return lines.join("\n");
}
