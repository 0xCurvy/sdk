import { describe, expect, it } from "vitest";
import type { DraftPlan, Intent } from "@/planner/types";
import { fakeBalanceEntry } from "@/test/fixtures";
import type { BalanceEntry, HexString } from "@/types";
import type { Currency, Network } from "@/types/api";
import { generatePlan } from "./generatePlan";

const fakeCurrency = (): Currency =>
  ({
    id: 1,
    symbol: "ETH",
    decimals: 18,
    contractAddress: "0x0000000000000000000000000000000000000000" as HexString,
    nativeCurrency: true,
  }) as unknown as Currency;

const fakeNetwork = (maxInputs = 2): Network =>
  ({ id: 1, name: "Ethereum", slug: "ethereum", aggregationCircuitConfig: { maxInputs } }) as unknown as Network;

const withdrawIntent = (amount: bigint): Intent => ({
  type: "external-transfer",
  amount,
  currency: fakeCurrency(),
  network: fakeNetwork(),
  recipient: "0x000000000000000000000000000000000000dEaD" as HexString,
});

const bal = (id: string, balance: bigint): BalanceEntry => fakeBalanceEntry({ id, balance });
const deps = { checkBytecode: async () => false };

/** Collect every command name in a draft plan tree. */
function commandNames(node: DraftPlan, acc: string[] = []): string[] {
  if (node.type === "command") acc.push(node.name);
  if (node.type === "serial" || node.type === "parallel") for (const i of node.items) commandNames(i, acc);
  return acc;
}

describe("generatePlan — withdrawal carve-out", () => {
  it("PARTIAL: withdrawing less than the selected note carves out the amount (aggregate) before withdraw", () => {
    // One 45 note, withdraw 5 → must aggregate (carve 5 to self, 40 change) then withdraw.
    const { plan } = generatePlan([bal("n1", 45n)], withdrawIntent(5n), deps);

    expect(plan.type).toBe("serial");
    const names = commandNames(plan);
    // Regression: the old plan was just [fold, withdraw] and paid the full 45 to the
    // recipient. The fix inserts a carve-out aggregation first.
    expect(names).toContain("aggregator-aggregate");
    expect(names[names.length - 1]).toBe("aggregator-withdraw");
  });

  it("EXACT: withdrawing the whole selected note withdraws directly (no carve-out)", () => {
    const { plan } = generatePlan([bal("n1", 5n)], withdrawIntent(5n), deps);

    const names = commandNames(plan);
    expect(names).not.toContain("aggregator-aggregate");
    expect(names).toEqual(["aggregator-withdraw"]);
  });

  it("PARTIAL across multiple notes still carves out before withdraw", () => {
    // 30 + 30 = 60 selected to cover 50 → overshoot 10 must be kept as change.
    const { plan } = generatePlan([bal("n1", 30n), bal("n2", 30n)], withdrawIntent(50n), deps);

    const names = commandNames(plan);
    expect(names).toContain("aggregator-aggregate");
    expect(names[names.length - 1]).toBe("aggregator-withdraw");
  });
});
