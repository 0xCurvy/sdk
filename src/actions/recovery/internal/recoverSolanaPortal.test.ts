import { afterEach, describe, expect, it, vi } from "vitest";
import { EvmRpc } from "@/rpc/evm";
import type { MultiRpc } from "@/rpc/multi";
import { SolanaRpc, type SolanaSigner } from "@/rpc/solana";
import { createFakeConfig, fixtureNetwork } from "@/test/fixtures";
import type { Currency, MatchedPortalRecord } from "@/types/api";
import type { HexString } from "@/types/helper";
import { recoverSolanaPortal } from "./recoverSolanaPortal";

const RECOVERY_PRIV_KEY = "0x0000000000000000000000000000000000000000000000000000000000000001" as HexString;
const PROGRAM = "11111111111111111111111111111111";
const DESTINATION = "So11111111111111111111111111111111111111112";
const NATIVE_SOL = "So11111111111111111111111111111111111111111";
const TX_SIG = "5SignatureBase58xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const NATIVE_SOL_CURRENCY: Currency = {
  id: 1,
  name: "Solana",
  symbol: "SOL",
  coinmarketcapId: "5426",
  iconUrl: "",
  price: null,
  updatedAt: "2024-01-01",
  decimals: 9,
  contractAddress: NATIVE_SOL as HexString,
  nativeCurrency: true,
  vaultTokenId: null,
  bridgeNetworkIdToCurrencyIdMap: {},
};

const solanaNetwork = (overrides = {}) =>
  fixtureNetwork({
    id: 900,
    flavour: "solana",
    portalProgramAddress: PROGRAM,
    rpcUrl: "https://solana.example",
    currencies: [NATIVE_SOL_CURRENCY],
    ...overrides,
  });

function solanaEntryRecord(overrides = {}): Extract<MatchedPortalRecord, { flavour: "solana" }> {
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
    ...overrides,
  } as Extract<MatchedPortalRecord, { flavour: "solana" }>;
}

const fakeSigner: SolanaSigner = {
  address: DESTINATION,
  signTransaction: vi.fn(async () => new Uint8Array([1, 2, 3])),
};

afterEach(() => vi.restoreAllMocks());

describe("recoverSolanaPortal", () => {
  it("builds a recover_sol instruction and submits it via sendTransactionWithSigner (native SOL)", async () => {
    const network = solanaNetwork();
    const rpcInstance = new SolanaRpc(network);
    const send = vi.fn(async (_instruction: unknown, _signer: SolanaSigner) => TX_SIG);
    vi.spyOn(rpcInstance, "sendTransactionWithSigner").mockImplementation(send as never);
    const rpc = { Network: vi.fn(() => rpcInstance) } as unknown as MultiRpc;
    const config = createFakeConfig({ rpc, networks: [network] });

    const sig = await recoverSolanaPortal(config, {
      network,
      portalRecord: solanaEntryRecord(),
      recoveryPrivateKey: RECOVERY_PRIV_KEY,
      mintAddress: NATIVE_SOL,
      destinationAddress: DESTINATION,
      signer: fakeSigner,
    });

    expect(sig).toBe(TX_SIG);
    expect(send).toHaveBeenCalledTimes(1);
    // First arg is the built kit Instruction; second is the signer.
    const [instruction, signer] = send.mock.calls[0] as [{ programAddress: string }, SolanaSigner];
    expect(instruction).toBeDefined();
    expect(instruction.programAddress).toBe(PROGRAM);
    expect(signer).toBe(fakeSigner);
  });

  it("throws for a non-entry portal record", async () => {
    const network = solanaNetwork();
    const config = createFakeConfig({ networks: [network] });

    await expect(
      recoverSolanaPortal(config, {
        network,
        portalRecord: solanaEntryRecord({ type: "exit" }),
        recoveryPrivateKey: RECOVERY_PRIV_KEY,
        mintAddress: NATIVE_SOL,
        destinationAddress: DESTINATION,
        signer: fakeSigner,
      }),
    ).rejects.toThrow(/Solana recovery supports entry portals only/);
  });

  it("throws when the network has no Solana program address", async () => {
    const network = solanaNetwork({ portalProgramAddress: undefined });
    const config = createFakeConfig({ networks: [network] });

    await expect(
      recoverSolanaPortal(config, {
        network,
        portalRecord: solanaEntryRecord(),
        recoveryPrivateKey: RECOVERY_PRIV_KEY,
        mintAddress: NATIVE_SOL,
        destinationAddress: DESTINATION,
        signer: fakeSigner,
      }),
    ).rejects.toThrow(/does not have a Solana portal program address/);
  });

  it("throws when the resolved RPC is not a SolanaRpc", async () => {
    const network = solanaNetwork();
    // Resolve an EvmRpc to trip the `instanceof SolanaRpc` guard.
    const evmInstance = new EvmRpc(
      fixtureNetwork({ currencies: [{ ...NATIVE_SOL_CURRENCY, symbol: "ETH", nativeCurrency: true }] }),
    );
    const rpc = { Network: vi.fn(() => evmInstance) } as unknown as MultiRpc;
    const config = createFakeConfig({ rpc, networks: [network] });

    await expect(
      recoverSolanaPortal(config, {
        network,
        portalRecord: solanaEntryRecord(),
        recoveryPrivateKey: RECOVERY_PRIV_KEY,
        mintAddress: NATIVE_SOL,
        destinationAddress: DESTINATION,
        signer: fakeSigner,
      }),
    ).rejects.toThrow(/is not a Solana RPC/);
  });
});
