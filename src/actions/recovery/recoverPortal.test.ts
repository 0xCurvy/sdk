import { afterEach, describe, expect, it, vi } from "vitest";
import { EvmRpc } from "@/rpc/evm";
import type { MultiRpc } from "@/rpc/multi";
import { createFakeApi, createFakeConfig, createFakeCore, fakeCurvyAccount, fixtureNetwork } from "@/test/fixtures";
import type { Currency, MatchedPortalRecord } from "@/types/api";
import type { HexString } from "@/types/helper";
import { recoverPortal } from "./recoverPortal";

// A valid (non-secret, well-known) 32-byte secp256k1 private key === 1, whose
// account is the generator-point address. Used as the derived recovery key so
// `privateKeyToAccount` succeeds offline.
const RECOVERY_PRIV_KEY = "0x0000000000000000000000000000000000000000000000000000000000000001" as HexString;
const RECOVERY_TX_HASH = "0xabc0000000000000000000000000000000000000000000000000000000000def" as HexString;

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

const FACTORY = "0x00000000000000000000000000000000000000fa";
const DESTINATION = "0x00000000000000000000000000000000000000d0";
const TOKEN = "0x00000000000000000000000000000000000000c0";
const RECOVERY_ADDR = "0x00000000000000000000000000000000000000e0";

const evmNetwork = (overrides = {}) =>
  fixtureNetwork({
    id: 42,
    portalFactoryContractAddress: FACTORY,
    currencies: [NATIVE_ETH],
    ...overrides,
  });

function evmEntryRecord(): Extract<MatchedPortalRecord, { flavour: "evm" }> {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    ephemeralKey: "0xeph1",
    viewTag: "0x01",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    type: "entry",
    ownerHash: "123",
    flavour: "evm",
    contractAddress: "0x00000000000000000000000000000000000000ff",
    recoveryAddress: RECOVERY_ADDR,
  };
}

function solanaEntryRecord(): Extract<MatchedPortalRecord, { flavour: "solana" }> {
  return {
    id: "00000000-0000-0000-0000-000000000002",
    ephemeralKey: "0xeph2",
    viewTag: "0x02",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    type: "entry",
    ownerHash: "456",
    flavour: "solana",
    contractAddress: "VaultPda1111111111111111111111111111111111",
    recoveryPubKey: "RecId1111111111111111111111111111111111111",
  };
}

/** Config whose `core.scan` yields the given derived spending private key. */
function makeConfig(opts: {
  spendingPrivKeys: (HexString | undefined)[];
  networks: ReturnType<typeof fixtureNetwork>[];
  writeContract?: ReturnType<typeof vi.fn>;
  waitForTransactionReceipt?: ReturnType<typeof vi.fn>;
  rpcNetwork?: ReturnType<typeof fixtureNetwork>;
  keyPairs?: { s?: string; v?: string };
}) {
  const writeContract = opts.writeContract ?? vi.fn(async () => RECOVERY_TX_HASH);
  const waitForTransactionReceipt = opts.waitForTransactionReceipt ?? vi.fn(async () => ({ status: "success" }));

  let rpcInstance: EvmRpc | undefined;
  if (opts.rpcNetwork) {
    rpcInstance = new EvmRpc(opts.rpcNetwork);
    vi.spyOn(rpcInstance, "provider", "get").mockReturnValue({ waitForTransactionReceipt } as never);
    vi.spyOn(rpcInstance, "walletClient", "get").mockReturnValue({ writeContract } as never);
  }
  const rpc = { Network: vi.fn(() => rpcInstance) } as unknown as MultiRpc;

  const core = createFakeCore({
    // `spendingPrivKeys` is typed `HexString[]` but the real scan yields `undefined`
    // for unmatched announcements; cast so the test can exercise that guard.
    scan: vi.fn(async () => ({
      spendingPubKeys: [],
      spendingPrivKeys: opts.spendingPrivKeys as HexString[],
    })),
  });
  const api = createFakeApi();
  const account = fakeCurvyAccount({
    keyPairs: { s: opts.keyPairs?.s ?? "11", v: opts.keyPairs?.v ?? "22" },
  });
  const config = createFakeConfig({
    rpc,
    core,
    api,
    liveAccounts: new Map([[account.id, account]]),
    activeAccountId: account.id,
    networks: opts.networks,
  });
  return { config, writeContract, waitForTransactionReceipt };
}

afterEach(() => vi.restoreAllMocks());

describe("recoverPortal", () => {
  it("dispatches to the EVM path and submits deployRecoveryEntryPortal with derived args", async () => {
    const network = evmNetwork();
    const { config, writeContract, waitForTransactionReceipt } = makeConfig({
      spendingPrivKeys: [RECOVERY_PRIV_KEY],
      networks: [network],
      rpcNetwork: network,
    });

    const txHash = await recoverPortal({
      config,
      networkId: 42,
      tokenAddress: TOKEN,
      portalRecord: evmEntryRecord(),
      destinationAddress: DESTINATION,
    });

    expect(txHash).toBe(RECOVERY_TX_HASH);
    expect(writeContract).toHaveBeenCalledTimes(1);
    const call = writeContract.mock.calls[0][0];
    expect(call.functionName).toBe("deployRecoveryEntryPortal");
    expect(call.address).toBe(FACTORY);
    // args: [ownerHash, recoveryAddress, tokenAddress, to]
    expect(call.args).toEqual([123n, RECOVERY_ADDR, TOKEN, DESTINATION]);
    // The derived recovery account is the tx sender.
    expect(call.account.address).toBe("0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf");
    expect(waitForTransactionReceipt).toHaveBeenCalledWith({ hash: RECOVERY_TX_HASH });
  });

  it("submits deployRecoveryExitPortal for an exit portal", async () => {
    const network = evmNetwork();
    const { config, writeContract } = makeConfig({
      spendingPrivKeys: [RECOVERY_PRIV_KEY],
      networks: [network],
      rpcNetwork: network,
    });

    const exitRecord = {
      ...evmEntryRecord(),
      type: "exit" as const,
      exitAddress: "0x00000000000000000000000000000000000000b0" as HexString,
      exitChainId: "10",
    } as Extract<MatchedPortalRecord, { flavour: "evm" }>;

    await recoverPortal({
      config,
      networkId: 42,
      tokenAddress: TOKEN,
      portalRecord: exitRecord,
      destinationAddress: DESTINATION,
    });

    const call = writeContract.mock.calls[0][0];
    expect(call.functionName).toBe("deployRecoveryExitPortal");
    // args: [exitAddress, exitChainId, recoveryAddress, tokenAddress, to]
    expect(call.args).toEqual(["0x00000000000000000000000000000000000000b0", 10n, RECOVERY_ADDR, TOKEN, DESTINATION]);
  });

  it("throws when a Solana recovery is requested without a signer (dispatch by flavour)", async () => {
    const solanaNetwork = evmNetwork({ flavour: "solana", portalProgramAddress: "Prog111" });
    const { config } = makeConfig({
      spendingPrivKeys: [RECOVERY_PRIV_KEY],
      networks: [solanaNetwork],
    });

    await expect(
      recoverPortal({
        config,
        networkId: 42,
        tokenAddress: "So11111111111111111111111111111111111111112",
        portalRecord: solanaEntryRecord(),
        destinationAddress: "Dest1111111111111111111111111111111111111",
        // no solanaSigner
      }),
    ).rejects.toThrow(/Solana recovery requires a connected Solana account signer/);
  });

  it("throws when no matching recovery key is derived from the announcement", async () => {
    const network = evmNetwork();
    const { config } = makeConfig({
      spendingPrivKeys: [undefined],
      networks: [network],
      rpcNetwork: network,
    });

    await expect(
      recoverPortal({
        config,
        networkId: 42,
        tokenAddress: TOKEN,
        portalRecord: evmEntryRecord(),
        destinationAddress: DESTINATION,
      }),
    ).rejects.toThrow(/Failed to derive recovery private key/);
  });

  it("throws when the network id is unknown", async () => {
    const { config } = makeConfig({ spendingPrivKeys: [RECOVERY_PRIV_KEY], networks: [] });

    await expect(
      recoverPortal({
        config,
        networkId: 999,
        tokenAddress: TOKEN,
        portalRecord: evmEntryRecord(),
        destinationAddress: DESTINATION,
      }),
    ).rejects.toThrow(/Network with id 999 not found/);
  });

  it("throws when the active account has no private keys", async () => {
    const { config } = makeConfig({
      spendingPrivKeys: [RECOVERY_PRIV_KEY],
      networks: [evmNetwork()],
      keyPairs: { s: "", v: "" },
    });

    await expect(
      recoverPortal({
        config,
        networkId: 42,
        tokenAddress: TOKEN,
        portalRecord: evmEntryRecord(),
        destinationAddress: DESTINATION,
      }),
    ).rejects.toThrow(/Active account has no private keys available for recovery/);
  });
});
