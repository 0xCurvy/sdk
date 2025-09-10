import { expect, test } from "vitest";
import { ScenarioBuilder } from "@/scenario-builder";
import { SBState } from "@/types/scenario-builder";

const demoState: SBState = {
  notes: [
    {
      owner: { ownerBabyJub: "1", sharedSecretData: { K: "11", V: "12" }},
      amount: 1n,
      token: 1n,
      isSpent: false,
    },
    {
      owner: { ownerBabyJub: "2", sharedSecretData: { K: "21", V: "22" } },
      amount: 2n,
      token: 1n,
      isSpent: false,
    },
  ],
  csucBalances: [
    { address: "0x1", amount: 1n,  token: 1n, isSpent: false },
    { address: "0x2", amount: 2n,  token: 1n, isSpent: false },
  ],
  stealthAddressBalances: [
    { address: "0x1", amount: 1n, token: 1n, isSpent: false },
    { address: "0x2", amount: 2n, token: 1n, isSpent: false },
  ],
};

test("Should initialize Scenario Builder", async () => {
  const scenarioBuilder = new ScenarioBuilder(demoState);
  expect(scenarioBuilder).toBeDefined();
});
