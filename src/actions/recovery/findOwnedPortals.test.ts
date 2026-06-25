import { afterEach, describe, expect, it, vi } from "vitest";
import { EvmRpc } from "@/rpc/evm";
import type { MultiRpc } from "@/rpc/multi";
import { createFakeApi, createFakeConfig, createFakeCore, fakeCurvyAccount, fixtureNetwork } from "@/test/fixtures";
import type { Currency, PortalRecord } from "@/types/api";
import { findOwnedPortals } from "./findOwnedPortals";

// Minimal native currency so the real `EvmRpc` constructor (which builds a viem
// chain and needs a native currency) can be instantiated in tests.
const NATIVE_ETH: Currency = {
  id: 1,
  name: "Ether",
  symbol: "ETH",
  coinmarketcapId: "1027",
  iconUrl: "",
  price: null,
  updatedAt: "2024-01-01",
  decimals: 18,
  contractAddress: "0x0000000000000000000000000000000000000000",
  nativeCurrency: true,
  vaultTokenId: null,
  bridgeNetworkIdToCurrencyIdMap: {},
};

// secp256k1 generator point G — its EVM recovery address is the well-known
// 0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf. Used as the spending pubkey
// returned by the fake `core.scan` so derivation is real and deterministic.
const G =
  "55066263022277343669578718895168534326250603453777594175500187360389116729240.32670510020758816978083085130507043184471273380659243275938904335757337482424";

const DERIVED_PORTAL = "0x00000000000000000000000000000000000000ff";

function entryPortal(overrides: Partial<PortalRecord> = {}): PortalRecord {
  return {
    id: 1,
    ephemeralKey: "0xeph1",
    viewTag: "0x01",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    type: "entry",
    ownerHash: "123",
    ...overrides,
  } as PortalRecord;
}

/**
 * Build a config whose `getRpc().Network()` returns a real `EvmRpc` (so the
 * `instanceof EvmRpc` guard passes) with its `multicall` spied/stubbed.
 */
function configWithEvmRpc(opts: {
  network: ReturnType<typeof fixtureNetwork>;
  portals: PortalRecord[];
  total: number;
  spendingPubKeys: string[];
  multicallImpl?: (args: unknown) => Promise<unknown>;
}) {
  const rpcInstance = new EvmRpc(opts.network);
  const multicall = vi.fn(
    opts.multicallImpl ?? (async () => opts.portals.map(() => ({ status: "success", result: DERIVED_PORTAL }))),
  );
  vi.spyOn(rpcInstance, "provider", "get").mockReturnValue({ multicall } as never);

  const rpc = { Network: vi.fn(() => rpcInstance) } as unknown as MultiRpc;

  const core = createFakeCore({
    scan: vi.fn(async () => ({ spendingPubKeys: opts.spendingPubKeys, spendingPrivKeys: [] })),
  });
  const api = createFakeApi({
    portal: { getPortalRecords: vi.fn(async () => ({ portals: opts.portals, total: opts.total })) },
  });

  const account = fakeCurvyAccount({ keyPairs: { s: "1", v: "2", babyJubjubPublicKey: "111.222" } });
  const config = createFakeConfig({
    rpc,
    core,
    api,
    liveAccounts: new Map([[account.id, account]]),
    activeAccountId: account.id,
    networks: [opts.network],
  });
  return { config, multicall, core, api };
}

const evmNetwork = () =>
  fixtureNetwork({
    portalFactoryContractAddress: "0x00000000000000000000000000000000000000fa",
    currencies: [NATIVE_ETH],
  });

afterEach(() => vi.restoreAllMocks());

describe("findOwnedPortals", () => {
  it("returns [] for a Solana network (entry-only, TODO)", async () => {
    const config = createFakeConfig();
    const solanaNetwork = fixtureNetwork({ flavour: "solana", portalProgramAddress: "Prog1111" });
    await expect(findOwnedPortals({ config, network: solanaNetwork })).resolves.toEqual([]);
  });

  it("returns [] when the portal table is empty", async () => {
    const { config } = configWithEvmRpc({
      network: evmNetwork(),
      portals: [],
      total: 0,
      spendingPubKeys: [],
    });
    await expect(findOwnedPortals({ config, network: evmNetwork() })).resolves.toEqual([]);
  });

  it("matches a portal whose announcement the account owns and re-derives its address", async () => {
    const network = evmNetwork();
    const { config, multicall } = configWithEvmRpc({
      network,
      portals: [entryPortal()],
      total: 1,
      // The scan reports ownership of index 0 (G), index-mismatch empties skipped.
      spendingPubKeys: [G],
    });

    const owned = await findOwnedPortals({ config, network });

    expect(owned).toHaveLength(1);
    expect(owned[0].flavour).toBe("evm");
    expect(owned[0].contractAddress).toBe(DERIVED_PORTAL);
    // recoveryAddress is derived from G — the canonical generator EVM address.
    expect((owned[0] as { recoveryAddress: string }).recoveryAddress).toBe(
      "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf",
    );
    // multicall called with a getEntryPortalAddress call against the factory.
    const callArg = multicall.mock.calls[0][0] as { contracts: { functionName: string }[] };
    expect(callArg.contracts[0].functionName).toBe("getEntryPortalAddress");
  });

  it("skips unmatched announcements (empty spendingPubKey) and never multicalls", async () => {
    const network = evmNetwork();
    const { config, multicall } = configWithEvmRpc({
      network,
      portals: [entryPortal()],
      total: 1,
      spendingPubKeys: [""],
    });

    await expect(findOwnedPortals({ config, network })).resolves.toEqual([]);
    expect(multicall).not.toHaveBeenCalled();
  });

  it("drops portals whose multicall entry failed", async () => {
    const network = evmNetwork();
    const { config } = configWithEvmRpc({
      network,
      portals: [entryPortal()],
      total: 1,
      spendingPubKeys: [G],
      multicallImpl: async () => [{ status: "failure", error: new Error("revert") }],
    });

    await expect(findOwnedPortals({ config, network })).resolves.toEqual([]);
  });

  it("throws when the network has no PortalFactory deployed", async () => {
    const network = fixtureNetwork({ portalFactoryContractAddress: undefined, currencies: [NATIVE_ETH] });
    const { config } = configWithEvmRpc({
      network,
      portals: [],
      total: 0,
      spendingPubKeys: [],
    });
    await expect(findOwnedPortals({ config, network })).rejects.toThrow(/does not have PortalFactory/);
  });
});
