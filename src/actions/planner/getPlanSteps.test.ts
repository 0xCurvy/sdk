import { describe, expect, it } from "vitest";
import type { DraftPlan } from "@/planner/types";
import { fakeBalanceEntry } from "@/test/fixtures";
import { getPlanSteps } from "./getPlanSteps";

describe("getPlanSteps", () => {
  it("returns ordered command and wait metadata without plan data", () => {
    const plan: DraftPlan = {
      type: "serial",
      items: [
        { type: "data", data: [fakeBalanceEntry()] },
        { type: "command", id: "aggregate", kind: "aggregator-aggregate" },
        {
          type: "wait",
          id: "delivery",
          name: "Confirm delivery",
          condition: {
            kind: "contract-code",
            networkSlug: "ethereum",
            address: "0x0000000000000000000000000000000000000001",
          },
        },
      ],
    };

    expect(getPlanSteps(plan)).toEqual([
      { id: "aggregate", kind: "aggregator-aggregate", label: "Aggregate funds", index: 0, total: 2 },
      { id: "delivery", kind: "wait", label: "Confirm delivery", index: 1, total: 2 },
    ]);
  });

  it("flattens nested parallel folds in stable display order", () => {
    const plan: DraftPlan = {
      type: "serial",
      items: [
        {
          type: "parallel",
          items: [
            {
              type: "serial",
              items: [
                { type: "data", data: [fakeBalanceEntry({ id: "left" })] },
                { type: "command", id: "left-aggregate", kind: "aggregator-aggregate" },
              ],
            },
            {
              type: "serial",
              items: [
                { type: "data", data: [fakeBalanceEntry({ id: "right" })] },
                { type: "command", id: "right-aggregate", kind: "aggregator-aggregate" },
              ],
            },
          ],
        },
        { type: "command", id: "final-withdraw", kind: "aggregator-withdraw" },
      ],
    };

    expect(getPlanSteps(plan)).toEqual([
      { id: "left-aggregate", kind: "aggregator-aggregate", label: "Aggregate funds", index: 0, total: 3 },
      { id: "right-aggregate", kind: "aggregator-aggregate", label: "Aggregate funds", index: 1, total: 3 },
      { id: "final-withdraw", kind: "aggregator-withdraw", label: "Withdraw funds", index: 2, total: 3 },
    ]);
  });

  it("counts wait nodes wherever they appear and ignores data nodes", () => {
    const wait = (id: string): DraftPlan => ({
      type: "wait",
      id,
      name: `Wait for ${id}`,
      condition: {
        kind: "contract-code",
        networkSlug: "ethereum",
        address: "0x0000000000000000000000000000000000000001",
      },
    });
    const plan: DraftPlan = {
      type: "parallel",
      items: [
        wait("portal"),
        {
          type: "serial",
          items: [
            { type: "data", data: [fakeBalanceEntry()] },
            { type: "command", id: "withdraw", kind: "aggregator-withdraw" },
            wait("settlement"),
          ],
        },
      ],
    };

    expect(getPlanSteps(plan)).toEqual([
      { id: "portal", kind: "wait", label: "Wait for portal", index: 0, total: 3 },
      { id: "withdraw", kind: "aggregator-withdraw", label: "Withdraw funds", index: 1, total: 3 },
      { id: "settlement", kind: "wait", label: "Wait for settlement", index: 2, total: 3 },
    ]);
  });
});
