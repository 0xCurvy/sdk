import { describe, expect, it } from "vitest";
import { MapStorage } from "@/storage/map-storage";
import { fakeBalanceEntry } from "@/test/fixtures";
import { recordTransferIntent } from "./recordTransferIntent";

describe("recordTransferIntent", () => {
  it("records multi-level local dependencies and distinguishes an external hot input", async () => {
    const storage = new MapStorage();
    const finalized = fakeBalanceEntry({ id: "finalized", finality: "finalized" });
    const parent = await recordTransferIntent({
      storage,
      accountId: finalized.accountId,
      intentId: "parent",
      networkSlug: finalized.networkSlug,
      action: "aggregation",
      token: "1",
      amount: "100",
      recipients: ["self"],
      input: [finalized],
      outputCommitments: ["parent-output"],
      finalityPolicy: "included",
      now: 1,
    });
    const child = await recordTransferIntent({
      storage,
      accountId: finalized.accountId,
      intentId: "child",
      networkSlug: finalized.networkSlug,
      action: "aggregation",
      token: "1",
      amount: "90",
      recipients: ["recipient"],
      input: [fakeBalanceEntry({ id: "parent-output", finality: "hot", originIntentId: parent.intentId })],
      outputCommitments: ["child-output"],
      finalityPolicy: "included",
      now: 2,
    });
    const external = await recordTransferIntent({
      storage,
      accountId: finalized.accountId,
      intentId: "external-child",
      networkSlug: finalized.networkSlug,
      action: "withdrawal",
      token: "1",
      amount: "50",
      recipients: ["0xrecipient"],
      input: [fakeBalanceEntry({ id: "external-output", finality: "hot" })],
      outputCommitments: [],
      finalityPolicy: "included",
      now: 3,
    });

    expect(child.localDependencyDepth).toBe(1);
    expect(child.hasExternalHotDependency).toBe(false);
    expect(external.hasExternalHotDependency).toBe(true);
    expect(await storage.getIntentDependencies(finalized.accountId)).toEqual([
      {
        accountId: finalized.accountId,
        fromIntentId: "parent",
        toIntentId: "child",
        noteId: "parent-output",
      },
    ]);
  });
});
