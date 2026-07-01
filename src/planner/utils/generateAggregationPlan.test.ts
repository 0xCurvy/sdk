import { describe, expect, it } from "vitest";
import type { DraftPlan, Intent } from "@/planner/types";
import { isPlanFlowControl } from "@/planner/types";
import { fakeBalanceEntry } from "@/test/fixtures";
import type { Currency, Network } from "@/types/api";
import type { HexString } from "@/types/helper";
import { generateAggregationPlan } from "./generateAggregationPlan";

/** A minimal currency stub — only the shape matters for these structural tests. */
const fakeCurrency = (): Currency =>
  ({
    id: 1,
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
    contractAddress: "0x0000000000000000000000000000000000000000" as HexString,
    nativeCurrency: true,
  }) as unknown as Currency;

/** A minimal network stub (aggregation dims now come from the protocol / the `maxInputs` param). */
const fakeNetwork = (): Network =>
  ({
    id: 1,
    name: "Ethereum",
    slug: "ethereum",
  }) as unknown as Network;

/** An external-transfer intent (hex recipient) over the given network. */
const fakeIntent = (network: Network): Intent => ({
  type: "external-transfer",
  amount: 100n,
  currency: fakeCurrency(),
  network,
  recipient: "0x000000000000000000000000000000000000dead" as HexString,
});

/** Wrap a balance entry as a `data` plan node. */
const dataNode = (id: string): DraftPlan => ({ type: "data", data: fakeBalanceEntry({ id }) });

describe("generateAggregationPlan", () => {
  it("wraps a single input in a serial Privacy Aggregation plan ending in an aggregate command", () => {
    const intent = fakeIntent(fakeNetwork());

    const plan = generateAggregationPlan([dataNode("a")], 2, intent);

    expect(isPlanFlowControl(plan)).toBe(true);
    if (!isPlanFlowControl(plan)) throw new Error("expected flow control");
    expect(plan.type).toBe("serial");
    expect(plan.name).toBe("Privacy Aggregation");
    expect(plan.items).toHaveLength(2);

    expect(plan.items[0].type).toBe("data");

    const command = plan.items[1];
    expect(command.type).toBe("command");
    if (command.type !== "command") throw new Error("expected command");
    expect(command.name).toBe("aggregator-aggregate");
    expect(typeof command.id).toBe("string");
    expect(command.id.length).toBeGreaterThan(0);
    expect(command.intent).toBe(intent);
  });

  it("folds N inputs into a tree whose final command is an aggregate command carrying the intent", () => {
    const intent = fakeIntent(fakeNetwork());

    const plan = generateAggregationPlan([dataNode("a"), dataNode("b"), dataNode("c")], 2, intent);

    expect(isPlanFlowControl(plan)).toBe(true);
    if (!isPlanFlowControl(plan)) throw new Error("expected flow control");
    expect(plan.items).toHaveLength(2);

    const last = plan.items[1];
    expect(last.type).toBe("command");
    if (last.type !== "command") throw new Error("expected command");
    expect(last.name).toBe("aggregator-aggregate");
    expect(typeof last.id).toBe("string");
    expect(last.id.length).toBeGreaterThan(0);
    expect(last.intent).toBe(intent);
  });

  it("throws when maxInputs is missing", () => {
    const intent = fakeIntent(fakeNetwork());

    expect(() => generateAggregationPlan([dataNode("a")], 0, intent)).toThrow(
      "aggregation plan requires a positive maxInputs",
    );
  });
});
