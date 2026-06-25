import { describe, expect, it, vi } from "vitest";
import type { CommandData, DraftCommand, Plan } from "@/planner/types";
import { fakeBalanceEntry } from "@/test/fixtures";
import { type PlanNodeHandlers, type PlanWalkResult, walkPlan } from "./walkPlan";

/** A command node carrying a synthetic estimate keyed by id. */
const cmd = (id: string): DraftCommand => ({ type: "command", id, name: `cmd-${id}` });
const dataNode = (id: string): Plan => ({ type: "data", data: fakeBalanceEntry({ id }) });

/**
 * Stub handlers that record invocation order. The command handler emits a fixed
 * per-id estimate so serial accumulation can be asserted, and threads a balance
 * entry forward as data.
 */
function makeHandlers(order: string[]): PlanNodeHandlers<DraftCommand> {
  return {
    command: vi.fn(async (node, input): Promise<PlanWalkResult> => {
      order.push(`command:${node.id}`);
      void input;
      return {
        success: true,
        estimate: { gasFeeInCurrency: 1n, curvyFeeInCurrency: 2n },
        data: fakeBalanceEntry({ id: `out-${node.id}`, balance: 100n }),
      };
    }),
    data: vi.fn(async (node): Promise<PlanWalkResult> => {
      const id = (node.data as { id: string }).id;
      order.push(`data:${id}`);
      return { success: true, data: node.data };
    }),
    wait: vi.fn(async (node, input): Promise<PlanWalkResult> => {
      order.push(`wait:${node.id}`);
      return { success: true, data: input };
    }),
  };
}

describe("walkPlan", () => {
  it("walks a serial tree in order, threading data and accumulating estimates", async () => {
    const order: string[] = [];
    const handlers = makeHandlers(order);

    const plan: Plan = {
      type: "serial",
      items: [dataNode("seed"), cmd("a"), cmd("b")],
    };

    const result = await walkPlan(plan, handlers, undefined);

    expect(result.success).toBe(true);
    // Serial preserves declaration order.
    expect(order).toEqual(["data:seed", "command:a", "command:b"]);
    // Two commands each contribute { gas: 1, curvy: 2 } => accumulated.
    if (result.success) {
      expect(result.estimate?.gasFeeInCurrency).toBe(2n);
      expect(result.estimate?.curvyFeeInCurrency).toBe(4n);
      // Last node's output is threaded out as the serial result data.
      expect((result.data as { id: string }).id).toBe("out-b");
    }
  });

  it("passes each serial node's output as the next node's input", async () => {
    const inputs: (CommandData | undefined)[] = [];
    const handlers: PlanNodeHandlers<DraftCommand> = {
      command: async (node, input) => {
        inputs.push(input);
        return { success: true, data: fakeBalanceEntry({ id: `out-${node.id}` }) };
      },
      data: async (node) => ({ success: true, data: node.data }),
      wait: async (_node, input) => ({ success: true, data: input }),
    };

    const plan: Plan = { type: "serial", items: [dataNode("seed"), cmd("a"), cmd("b")] };
    await walkPlan(plan, handlers, undefined);

    // cmd:a receives the seed data node's entry; cmd:b receives cmd:a's output.
    expect((inputs[0] as { id: string }).id).toBe("seed");
    expect((inputs[1] as { id: string }).id).toBe("out-a");
  });

  it("runs parallel branches and calls emitProgress with the aggregate result", async () => {
    const order: string[] = [];
    const handlers = makeHandlers(order);
    const emitProgress = vi.fn();

    // Parallel passes `undefined` to each branch (faithful to the legacy walker),
    // so each branch must self-seed its input via a leading data node.
    const plan: Plan = {
      type: "parallel",
      name: "fan-out",
      items: [
        { type: "serial", items: [dataNode("s1"), cmd("p1")] },
        { type: "serial", items: [dataNode("s2"), cmd("p2")] },
      ],
    };

    const result = await walkPlan(plan, handlers, fakeBalanceEntry({ id: "in" }), emitProgress);

    expect(result.success).toBe(true);
    // Both branches ran (each: seed data node then its command).
    expect(order.sort()).toEqual(["command:p1", "command:p2", "data:s1", "data:s2"]);
    // Parallel merges the two estimates.
    if (result.success) {
      expect(result.estimate?.gasFeeInCurrency).toBe(2n);
      expect(result.estimate?.curvyFeeInCurrency).toBe(4n);
    }
    // emitProgress was called once for the parallel node with a successful result.
    expect(emitProgress).toHaveBeenCalledTimes(1);
    const [emittedPlan, emittedResult] = emitProgress.mock.calls[0];
    expect(emittedPlan).toBe(plan);
    expect(emittedResult.success).toBe(true);
    expect(emittedResult.items).toHaveLength(2);
  });

  it("propagates wait nodes through the handler", async () => {
    const order: string[] = [];
    const handlers = makeHandlers(order);

    const plan: Plan = {
      type: "serial",
      items: [dataNode("seed"), { type: "wait", id: "w1", name: "Waiting", condition: async () => true }],
    };

    const result = await walkPlan(plan, handlers, undefined);
    expect(result.success).toBe(true);
    expect(order).toEqual(["data:seed", "wait:w1"]);
    // wait threads the prior data through unchanged.
    if (result.success) expect((result.data as { id: string }).id).toBe("seed");
  });

  it("short-circuits a serial node on the first failure", async () => {
    const order: string[] = [];
    const handlers: PlanNodeHandlers<DraftCommand> = {
      command: async (node) => {
        order.push(`command:${node.id}`);
        if (node.id === "a") return { success: false, error: new Error("a failed") };
        return { success: true, data: fakeBalanceEntry({ id: `out-${node.id}` }) };
      },
      data: async (node) => ({ success: true, data: node.data }),
      wait: async (_node, input) => ({ success: true, data: input }),
    };

    const plan: Plan = { type: "serial", items: [cmd("a"), cmd("b")] };
    const result = await walkPlan(plan, handlers, fakeBalanceEntry({ id: "in" }));

    expect(result.success).toBe(false);
    // cmd:b is never reached.
    expect(order).toEqual(["command:a"]);
  });

  it("marks a parallel node failed when any branch fails and still emits progress", async () => {
    const emitProgress = vi.fn();
    const handlers: PlanNodeHandlers<DraftCommand> = {
      command: async (node) => {
        if (node.id === "bad") return { success: false, error: new Error("bad") };
        return { success: true, data: fakeBalanceEntry({ id: `out-${node.id}` }) };
      },
      data: async (node) => ({ success: true, data: node.data }),
      wait: async (_node, input) => ({ success: true, data: input }),
    };

    const plan: Plan = {
      type: "parallel",
      items: [
        { type: "serial", items: [dataNode("s-ok"), cmd("ok")] },
        { type: "serial", items: [dataNode("s-bad"), cmd("bad")] },
      ],
    };
    const result = await walkPlan(plan, handlers, fakeBalanceEntry({ id: "in" }), emitProgress);

    expect(result.success).toBe(false);
    expect(emitProgress).toHaveBeenCalledTimes(1);
    expect(emitProgress.mock.calls[0][1].success).toBe(false);
  });

  it("throws when a command node receives no input", async () => {
    const handlers = makeHandlers([]);
    const plan: Plan = { type: "command", id: "x", name: "cmd-x" };
    await expect(walkPlan(plan, handlers, undefined)).rejects.toThrow("Input is required for command node!");
  });

  it("throws on an empty serial node", async () => {
    const handlers = makeHandlers([]);
    const plan: Plan = { type: "serial", items: [] };
    await expect(walkPlan(plan, handlers, undefined)).rejects.toThrow("No items in serial node!");
  });
});
