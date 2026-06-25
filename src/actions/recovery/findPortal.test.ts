import { getAddress } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EvmRpc } from "@/rpc/evm";
import type { MultiRpc } from "@/rpc/multi";
import { createFakeApi, createFakeConfig, createFakeCore, fakeCurvyAccount, fixtureNetwork } from "@/test/fixtures";
import type { Currency, PortalRecord } from "@/types/api";
import { findPortal } from "./findPortal";

const G =
  "55066263022277343669578718895168534326250603453777594175500187360389116729240.32670510020758816978083085130507043184471273380659243275938904335757337482424";

const DERIVED_PORTAL = "0x00000000000000000000000000000000000000ff";

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

function entryPortal(): PortalRecord {
  return {
    id: 1,
    ephemeralKey: "0xeph1",
    viewTag: "0x01",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    type: "entry",
    ownerHash: "123",
  } as PortalRecord;
}

const evmNetwork = () =>
  fixtureNetwork({
    portalFactoryContractAddress: "0x00000000000000000000000000000000000000fa",
    currencies: [NATIVE_ETH],
  });

function configWithEvmRpc(network: ReturnType<typeof fixtureNetwork>) {
  const rpcInstance = new EvmRpc(network);
  const multicall = vi.fn(async () => [{ status: "success", result: DERIVED_PORTAL }]);
  vi.spyOn(rpcInstance, "provider", "get").mockReturnValue({ multicall } as never);

  const rpc = { Network: vi.fn(() => rpcInstance) } as unknown as MultiRpc;
  const core = createFakeCore({
    scan: vi.fn(async () => ({ spendingPubKeys: [G], spendingPrivKeys: [] })),
  });
  const api = createFakeApi({
    portal: { getPortalRecords: vi.fn(async () => ({ portals: [entryPortal()], total: 1 })) },
  });
  const account = fakeCurvyAccount({ keyPairs: { s: "1", v: "2", babyJubjubPublicKey: "111.222" } });
  return createFakeConfig({
    rpc,
    core,
    api,
    liveAccounts: new Map([[account.id, account]]),
    activeAccountId: account.id,
    networks: [network],
  });
}

afterEach(() => vi.restoreAllMocks());

describe("findPortal", () => {
  it("returns the matching owned EVM portal for the target address", async () => {
    const network = evmNetwork();
    const config = configWithEvmRpc(network);

    const found = await findPortal({ config, address: DERIVED_PORTAL, network });

    expect(found).not.toBeNull();
    expect(found?.contractAddress).toBe(DERIVED_PORTAL);
    // Match is checksum-insensitive on input: a lowercased target still matches.
    const checksummed = getAddress(DERIVED_PORTAL);
    expect(getAddress(found?.contractAddress as `0x${string}`)).toBe(checksummed);
  });

  it("returns null when no owned EVM portal matches the target address", async () => {
    const network = evmNetwork();
    const config = configWithEvmRpc(network);

    const found = await findPortal({
      config,
      address: "0x00000000000000000000000000000000000000aa",
      network,
    });

    expect(found).toBeNull();
  });

  it("throws when an EVM recovery is given a non-hex address", async () => {
    const network = evmNetwork();
    const config = configWithEvmRpc(network);

    await expect(findPortal({ config, address: "not-hex", network })).rejects.toThrow(
      /EVM recovery requires a hex address/,
    );
  });

  it("dispatches to the Solana path and throws on an invalid base58 address", async () => {
    const config = createFakeConfig();
    const solanaNetwork = fixtureNetwork({
      flavour: "solana",
      portalProgramAddress: "11111111111111111111111111111111",
    });
    const account = fakeCurvyAccount({ keyPairs: { s: "1", v: "2" } });
    config.keyring.set(account.id, account.keyPairs);
    config.setState({ activeAccountId: account.id });

    await expect(
      findPortal({ config, address: "not a valid solana address!!!", network: solanaNetwork }),
    ).rejects.toThrow(/Invalid Solana address/);
  });

  it("dispatches to the Solana path and throws when no program address is configured", async () => {
    const config = createFakeConfig();
    const solanaNetwork = fixtureNetwork({ flavour: "solana", portalProgramAddress: undefined });

    await expect(
      findPortal({ config, address: "11111111111111111111111111111111", network: solanaNetwork }),
    ).rejects.toThrow(/does not have a Solana portal program address/);
  });
});
