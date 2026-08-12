import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandError } from "@/errors";
import { Note } from "@/note";
import { generateWithdrawalCircuitInputsFromNotes } from "@/proving/witnessFromNotes";
import { createFakeConfig, fixtureNetwork } from "@/test/fixtures";
import { loadArtifactsAndProve } from "../proving/internal/loadArtifactsAndProve";
import { resolveCircuitArtifacts } from "../proving/internal/resolveCircuitArtifacts";
import { buildWithdrawRequest } from "./buildWithdrawRequest";
import { attachSubmissionSugar } from "./internal/attachSugar";

vi.mock("../proving/internal/loadArtifactsAndProve", () => ({ loadArtifactsAndProve: vi.fn() }));
vi.mock("../proving/internal/resolveCircuitArtifacts", () => ({ resolveCircuitArtifacts: vi.fn() }));
vi.mock("./internal/attachSugar", () => ({ attachSubmissionSugar: vi.fn((_config, value) => value) }));
vi.mock("@/proving/groth16", () => ({ formatGroth16ProofForSolidity: vi.fn(() => ["proof"]) }));
vi.mock("@/proving/witnessFromNotes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/proving/witnessFromNotes")>()),
  generateWithdrawalCircuitInputsFromNotes: vi.fn(),
  flattenWithdrawalCircuitInputs: vi.fn(() => []),
}));

const network = fixtureNetwork({ aggregatorContractAddress: "0x00000000000000000000000000000000000000a1" });
const input = new Note({
  amount: 100n,
  token: 1n,
  owner: { babyJubjubPublicKey: { x: 1n, y: 2n }, sharedSecret: 3n },
  ephemeralKey: [4n, 5n],
  viewTag: 6n,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveCircuitArtifacts).mockReturnValue({ maxInputs: 2, treeDepth: 30 } as never);
  vi.mocked(generateWithdrawalCircuitInputsFromNotes).mockResolvedValue({} as never);
  vi.mocked(loadArtifactsAndProve).mockResolvedValue({ proof: {}, publicSignals: ["100", "11", "12"] } as never);
});

describe("buildWithdrawRequest", () => {
  it("builds a payload and decodes the gross amount and nullifiers", async () => {
    const config = createFakeConfig({ networks: [network], activeNetworks: [network] });

    await buildWithdrawRequest({
      config,
      notes: [input],
      ownerBjjPrivateKeyHex: "01",
      destinationAddress: 42n,
      tokenId: 1n,
    });

    expect(generateWithdrawalCircuitInputsFromNotes).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: [input],
        destinationAddress: 42n,
        tokenId: 1n,
        maxInputs: 2,
        treeDepth: 30,
      }),
    );
    expect(attachSubmissionSugar).toHaveBeenCalledWith(
      config,
      expect.objectContaining({
        action: "withdrawal",
        contractArg: 2,
        withdrawnAmount: 100n,
        nullifiers: [11n, 12n],
      }),
    );
  });

  it.each([-1n, 1n << 160n])("rejects an invalid EVM destination (%s)", async (destinationAddress) => {
    const config = createFakeConfig({ networks: [network], activeNetworks: [network] });
    await expect(
      buildWithdrawRequest({
        config,
        notes: [input],
        ownerBjjPrivateKeyHex: "01",
        destinationAddress,
        tokenId: 1n,
      }),
    ).rejects.toBeInstanceOf(CommandError);
    expect(generateWithdrawalCircuitInputsFromNotes).not.toHaveBeenCalled();
  });
});
