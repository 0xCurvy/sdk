import { describe, expect, it, vi } from "vitest";
import { NETWORK_ENVIRONMENT } from "@/constants/networks";
import { NoActiveAccountError } from "@/errors";
import type { Intent } from "@/planner/types";
import { MapStorage } from "@/storage/map-storage";
import {
  createFakeConfig,
  createFakeMultiRpc,
  DEFAULT_TEST_PROTOCOL,
  fakeBalanceEntry,
  fakeCurvyAccount,
  fixtureNetwork,
} from "@/test/fixtures";
import type { BalanceEntry, CurvyId, HexString } from "@/types";
import { estimateIntent } from "./estimateIntent";
import { executeIntent } from "./executeIntent";
import { runSubmittedCommand } from "./internal/runSubmittedCommand";

// Keep real planning, fee estimation and execution; stop at the submission boundary.
vi.mock("./internal/runSubmittedCommand", () => ({ runSubmittedCommand: vi.fn(async () => ({})) }));

const NETWORK = fixtureNetwork({ vaultContractAddress: "0x00000000000000000000000000000000000000a2" });

/** Protocol-global proving config with groupFee 10 on both aggregation and withdrawal (fee = amount*10/1000). */
const PROTOCOL = {
  ...DEFAULT_TEST_PROTOCOL,
  proving: {
    ...DEFAULT_TEST_PROTOCOL.proving,
    aggregation: { ...DEFAULT_TEST_PROTOCOL.proving.aggregation, groupFee: 10 },
    withdrawal: { ...DEFAULT_TEST_PROTOCOL.proving.withdrawal, groupFee: 10 },
  },
};

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
  const rpc = createFakeMultiRpc();
  vi.mocked(rpc.Network).mockReturnValue({
    provider: { readContract: vi.fn(async () => ({ withdrawal: 0n })) },
  } as never);

  return createFakeConfig({
    rpc,
    storage,
    networks: [NETWORK],
    protocol: PROTOCOL,
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
  it("estimates a public-swap withdrawal for an account that exists only in the keyring", async () => {
    const config = await buildConfig({ seed: [entry({ id: "note-1", balance: 1000n })] });
    config.setState({ accounts: {} });

    const estimation = await estimateIntent({ intent, config });

    expect(estimation.effectiveAmount).toBe(990n);
    expect(config.state.accounts).toEqual({});
    const result = await executeIntent({ prepared: estimation.prepared, config });
    expect(result.data).toMatchObject({ kind: "delivered", amount: 990n });
    expect(runSubmittedCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "withdrawal",
        accountId: "account-a",
        recipients: [intent.recipient],
        amount: "990",
      }),
    );
  });

  it("rejects an active account whose keys are unavailable", async () => {
    const config = await buildConfig();
    config.keyring.clear();
    await expect(estimateIntent({ intent, config })).rejects.toBeInstanceOf(NoActiveAccountError);
  });

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
        expect(last.kind).toBe("aggregator-withdraw");
        // The command carries its estimate after estimation.
        expect((last as { estimate?: { curvyFeeInCurrency: bigint } }).estimate?.curvyFeeInCurrency).toBe(10n);
      }
    }
  });
});
