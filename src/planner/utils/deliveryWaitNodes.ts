import { v4 as uuidV4 } from "uuid";
import type { ExternalTransferIntent, PlanWait, SwapIntent } from "@/planner/types";

/** Build the observable delivery milestones shown after a withdrawal. */
export function deliveryWaitNodes(
  intent: ExternalTransferIntent | SwapIntent,
  shieldSettleDelayMs?: number,
): PlanWait[] {
  if (intent.type === "curvy-swap") {
    return [
      {
        type: "wait",
        name: "Confirming swap completion",
        id: uuidV4(),
        condition: {
          kind: "contract-code",
          networkSlug: intent.network.slug,
          address: intent.recipient,
        },
      },
      {
        type: "wait",
        name: "Confirming shield into Curvy",
        id: uuidV4(),
        condition: {
          kind: "contract-code",
          networkSlug: intent.network.slug,
          address: intent.entryAddress,
          settleDelayMs: shieldSettleDelayMs,
        },
      },
    ];
  }

  // A portal exists only for bridge/swap delivery. A direct external transfer
  // pays the recipient address and has no contract-deployment milestone.
  if (!intent.exitNetwork && !intent.exitCurrency) return [];
  return [
    {
      type: "wait",
      name: "Confirming delivery",
      id: uuidV4(),
      condition: {
        kind: "contract-code",
        networkSlug: intent.network.slug,
        address: intent.recipient,
      },
    },
  ];
}
