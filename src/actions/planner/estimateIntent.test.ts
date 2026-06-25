import { describe, expect, it } from "vitest";
import { NETWORK_ENVIRONMENT } from "@/constants/networks";
import { NoActiveAccountError } from "@/errors";
import type { Intent } from "@/planner/types";
import { MapStorage } from "@/storage/map-storage";
import { createFakeConfig, fakeBalanceEntry, fakeCurvyAccount, fixtureNetwork } from "@/test/fixtures";
import type { BalanceEntry, CurvyId, HexString } from "@/types";
import { estimateIntent } from "./estimateIntent";

/** A network with withdraw/aggregation circuit configs so commands can estimate. */
const NETWORK = fixtureNetwork({
  aggregationCircuitConfig: { treeDepth: 32, maxInputs: 2, maxOutputs: 2, batchSize: 1, groupFee: 10 },
  withdrawCircuitConfig: { treeDepth: 32, maxInputs: 2, maxOutputs: 2, batchSize: 1, groupFee: 10 },
});

const CURRENCY_ADDRESS = "0x0000000000000000000000000000000000000000" as HexString;

/** `balanceEntryToNote` needs a decimal "X.Y" ephemeralKey, not the fixture's "0xeph". */
function entry(overrides: Partial<BalanceEntry> = {}): BalanceEntry {
  return fakeBalanceEntry({
    accountId: "account-a",
    networkSlug: "ethereum",
    currencyAddress: CURRENCY_ADDRESS,
    deliveryTag: { ephemeralKey: "4.5", viewTag: "0x6" },
    ...overrides,
  });
}

/** A same-network external-transfer intent (hex recipient, no exit leg => no getQuote). */
const intent: Intent = {
  type: "external-transfer",
  amount: 1000n,
  currency: { contractAddress: CURRENCY_ADDRESS } as never,
  network: NETWORK,
  recipient: "0x000000000000000000000000000000000000dEaD" as HexString,
};

/** Build a config with an active account wired for both state and the live map. */
async function buildConfig(opts: { withAccount?: boolean; seed?: BalanceEntry[] } = {}) {
  const { withAccount = true, seed = [] } = opts;
  const storage = new MapStorage();
  if (seed.length > 0) await storage.updateBalanceEntries("account-a", "ethereum", seed);

  return createFakeConfig({
    storage,
    networks: [NETWORK],
    activeAccountId: withAccount ? "account-a" : null,
    accounts: withAccount
      ? {
          "account-a": {
            id: "account-a",
            createdAt: 1_700_000_000_000,
            ownerAddress: "0x000000000000000000000000000000000000000a",
            curvyHandle: "alice.curvy.name" as CurvyId,
            scanCursors: { latest: undefined, oldest: undefined },
          },
        }
      : {},
    liveAccounts: withAccount ? new Map([["account-a", fakeCurvyAccount()]]) : new Map(),
  });
}

describe("estimateIntent", () => {
  it("throws NoActiveAccountError when there is no active account", async () => {
    const config = await buildConfig({ withAccount: false });
    await expect(estimateIntent({ intent, config })).rejects.toBeInstanceOf(NoActiveAccountError);
  });

  it("estimates two notes withdrawn to the exact amount: curvy fee only, no bridge fee", async () => {
    // v3 withdrawal needs exactly maxInputs (2) committed notes; 500 + 500 = 1000n
    // exact => plan is serial[ parallel[data,data], aggregator-withdraw ]; groupFee 10 => fee 10.
    const seeded = [
      entry({ id: "note-1", balance: 500n, environment: NETWORK_ENVIRONMENT.MAINNET }),
      entry({ id: "note-2", balance: 500n, environment: NETWORK_ENVIRONMENT.MAINNET }),
    ];
    const config = await buildConfig({ seed: seeded });

    const estimation = await estimateIntent({ intent, config });

    expect(estimation.curvyFee).toBe(10n);
    expect(estimation.gas).toBe(0n);
    expect(estimation.bridgeFee).toBeUndefined();
    // effectiveAmount = netAmount = 1000 - 10 - 0 = 990.
    expect(estimation.effectiveAmount).toBe(990n);
    // Both seeded notes are consumed.
    expect(new Set(estimation.usedBalances.map((b) => b.id))).toEqual(new Set(["note-1", "note-2"]));
    // A withdraw command lands in the estimated plan tree.
    expect(estimation.plan).toBeDefined();
  });

  it("returns the estimated plan tree as a serial node ending in a withdraw command", async () => {
    const seeded = [entry({ id: "note-1", balance: 500n }), entry({ id: "note-2", balance: 500n })];
    const config = await buildConfig({ seed: seeded });

    const { plan } = await estimateIntent({ intent, config });

    expect(plan.type).toBe("serial");
    if (plan.type === "serial") {
      const last = plan.items[plan.items.length - 1];
      expect(last.type).toBe("command");
      if (last.type === "command") {
        expect(last.name).toBe("aggregator-withdraw");
        // The command carries its estimate after estimation.
        expect((last as { estimate?: { curvyFeeInCurrency: bigint } }).estimate?.curvyFeeInCurrency).toBe(10n);
      }
    }
  });
});
