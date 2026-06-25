import { describe, expect, it } from "vitest";
import type { DraftPlan } from "@/planner/types";
import type { BalanceEntry } from "@/types";
import { describePlan } from "./describePlan";

const entry = (symbol: string, balance: bigint) =>
  ({ symbol, balance, networkSlug: "ethereum" }) as unknown as BalanceEntry;

describe("describePlan", () => {
  it("renders a single data node", () => {
    const plan: DraftPlan = { type: "data", data: entry("USDC", 100n) };
    expect(describePlan(plan)).toBe("data: USDC 100 (ethereum)");
  });

  it("summarizes a multi-note data node", () => {
    const plan: DraftPlan = { type: "data", data: [entry("USDC", 100n), entry("USDC", 50n)] };
    expect(describePlan(plan)).toBe("data: 2 notes, total 150");
  });

  it("renders a serial tree with command and wait nodes", () => {
    const plan: DraftPlan = {
      type: "serial",
      items: [
        { type: "data", data: entry("USDC", 100n) },
        { type: "command", id: "1", name: "aggregator-withdraw" },
        { type: "wait", id: "2", name: "Confirming delivery", condition: async () => true },
      ],
    };

    const out = describePlan(plan).split("\n");
    expect(out[0]).toBe("serial");
    expect(out[1]).toBe("├─ data: USDC 100 (ethereum)");
    expect(out[2]).toBe("├─ command: aggregator-withdraw");
    expect(out[3]).toBe("└─ wait: Confirming delivery");
  });
});
