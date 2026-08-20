import type { WalletClient } from "viem";
import { describe, expect, it, vi } from "vitest";
import { Note } from "@/note";
import type { MultiRpc } from "@/rpc/multi";
import { createFakeConfig, createFakeCore, fakeCurvyAccount, fixtureNetwork } from "@/test/fixtures";
import type { Currency } from "@/types";
import { directShield } from "./directShield";

const ACCOUNT_ADDRESS = "0x00000000000000000000000000000000000000a1";
const AGGREGATOR_ADDRESS = "0x00000000000000000000000000000000000000a2";
const TOKEN_ADDRESS = "0x00000000000000000000000000000000000000a3";
const VAULT_ADDRESS = "0x00000000000000000000000000000000000000a4";

function currency(overrides: Partial<Currency> = {}): Currency {
  return {
    id: 1,
    name: "Ether",
    symbol: "ETH",
    coinmarketcapId: "1027",
    iconUrl: "",
    price: "1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    decimals: 18,
    contractAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    nativeCurrency: true,
    vaultTokenId: "1",
    bridgeNetworkIdToCurrencyIdMap: {},
    ...overrides,
  };
}

function setup(
  options: {
    native: boolean;
    allowance?: bigint;
    tokenContractAddress?: string;
    walletChainId?: number;
    walletHasStaticChain?: boolean;
  } = { native: true },
) {
  const note = new Note({
    amount: 1_000n,
    token: options.native ? 1n : 2n,
    owner: { babyJubjubPublicKey: { x: 11n, y: 12n }, sharedSecret: 13n },
    ephemeralKey: [14n, 15n],
    viewTag: 16n,
  });
  const core = createFakeCore({ sendNote: vi.fn(async () => note) });
  const simulateContract = vi.fn(async (call: { functionName: string }) => ({
    request: { operation: call.functionName },
  }));
  const readContract = vi.fn(async () => options.allowance ?? 0n);
  const waitForTransactionReceipt = vi.fn(async ({ hash }: { hash: string }) => ({
    status: "success",
    transactionHash: hash,
    logs: [],
  }));
  const provider = { simulateContract, readContract, waitForTransactionReceipt };
  const rpc = { Network: vi.fn(() => ({ provider })) } as unknown as MultiRpc;
  const writeContract = vi.fn(async (request: { operation: string }) =>
    request.operation === "approve" ? "0xapproval" : "0xshield",
  );
  const walletClient = {
    account: { address: ACCOUNT_ADDRESS },
    chain: options.walletHasStaticChain === false ? undefined : { id: options.walletChainId ?? 31_337 },
    getChainId: vi.fn(async () => options.walletChainId ?? 31_337),
    writeContract,
  } as unknown as WalletClient;
  const tokenCurrency = options.native
    ? currency()
    : currency({
        id: 2,
        name: "Mock",
        symbol: "MOCK",
        contractAddress: (options.tokenContractAddress ?? TOKEN_ADDRESS) as Currency["contractAddress"],
        nativeCurrency: false,
        vaultTokenId: "2",
      });
  const network = fixtureNetwork({
    id: 31_337,
    chainId: "31337",
    slug: "localnet",
    testnet: true,
    aggregatorContractAddress: AGGREGATOR_ADDRESS,
    vaultContractAddress: VAULT_ADDRESS,
    currencies: [tokenCurrency],
  });
  const config = createFakeConfig({
    activeAccountId: "account-a",
    liveAccounts: new Map([["account-a", fakeCurvyAccount()]]),
    networks: [network],
    activeNetworks: [network],
    core,
    rpc,
  });

  return { config, note, readContract, simulateContract, walletClient, writeContract };
}

describe("directShield", () => {
  it("sends native value to directShield for the active Curvy account", async () => {
    const { config, note, readContract, simulateContract, walletClient, writeContract } = setup();

    const result = await directShield({ config, networkSlug: "localnet", amount: 1_000n, token: 1n, walletClient });

    expect(readContract).not.toHaveBeenCalled();
    expect(simulateContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: AGGREGATOR_ADDRESS,
        functionName: "directShield",
        value: 1_000n,
        args: [
          expect.objectContaining({
            ownerHash: note.ownerHash,
            amount: 1_000n,
            token: 1n,
            ephemeralKey: [14n, 15n],
            viewTag: 16,
          }),
        ],
      }),
    );
    expect(writeContract).toHaveBeenCalledTimes(1);
    expect(result.transactionHash).toBe("0xshield");
    expect(result.approval).toBeUndefined();
  });

  it("approves an insufficient ERC-20 allowance before shielding", async () => {
    const { config, readContract, simulateContract, walletClient, writeContract } = setup({
      native: false,
      allowance: 0n,
    });

    const result = await directShield({ config, networkSlug: "localnet", amount: 1_000n, token: 2n, walletClient });

    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "allowance", args: [ACCOUNT_ADDRESS, VAULT_ADDRESS] }),
    );
    expect(simulateContract).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        address: TOKEN_ADDRESS,
        abi: [expect.objectContaining({ name: "approve", outputs: [] })],
        functionName: "approve",
        args: [VAULT_ADDRESS, 1_000n],
      }),
    );
    expect(simulateContract).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ functionName: "directShield", value: undefined }),
    );
    expect(writeContract).toHaveBeenCalledTimes(2);
    expect(result.approval?.transactionHash).toBe("0xapproval");
    expect(result.transactionHash).toBe("0xshield");
  });

  it("does not send an approval when the existing allowance is sufficient", async () => {
    const { config, simulateContract, walletClient, writeContract } = setup({ native: false, allowance: 1_000n });

    const result = await directShield({ config, networkSlug: "localnet", amount: 1_000n, token: 2n, walletClient });

    expect(simulateContract).toHaveBeenCalledTimes(1);
    expect(simulateContract).toHaveBeenCalledWith(expect.objectContaining({ functionName: "directShield" }));
    expect(writeContract).toHaveBeenCalledTimes(1);
    expect(result.approval).toBeUndefined();
  });

  it("rejects a mismatched injected wallet chain when static chain metadata is absent", async () => {
    const { config, walletClient } = setup({ native: true, walletChainId: 1, walletHasStaticChain: false });

    await expect(
      directShield({ config, networkSlug: "localnet", amount: 1_000n, token: 1n, walletClient }),
    ).rejects.toThrow("wallet chain 1 does not match localnet (31337)");
  });

  it("rejects an ERC-20 currency without a valid contract address", async () => {
    const { config, walletClient } = setup({ native: false, tokenContractAddress: "" });

    await expect(
      directShield({ config, networkSlug: "localnet", amount: 1_000n, token: 2n, walletClient }),
    ).rejects.toThrow('currency "MOCK" on network "localnet" has no valid contractAddress');
  });

  it("resets a non-zero insufficient allowance before approving", async () => {
    const { config, simulateContract, walletClient, writeContract } = setup({ native: false, allowance: 500n });

    const result = await directShield({ config, networkSlug: "localnet", amount: 1_000n, token: 2n, walletClient });

    expect(simulateContract).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ functionName: "approve", args: [VAULT_ADDRESS, 0n] }),
    );
    expect(simulateContract).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ functionName: "approve", args: [VAULT_ADDRESS, 1_000n] }),
    );
    expect(simulateContract).toHaveBeenNthCalledWith(3, expect.objectContaining({ functionName: "directShield" }));
    expect(writeContract).toHaveBeenCalledTimes(3);
    expect(result.approval?.transactionHash).toBe("0xapproval");
    expect(result.transactionHash).toBe("0xshield");
  });
});
