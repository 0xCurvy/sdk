import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandError } from "@/errors";
import { Note } from "@/note";
import { buildAggregationWitnessBundle } from "@/proving/witnessFromNotes";
import { createFakeConfig, fixtureNetwork } from "@/test/fixtures";
import { loadArtifactsAndProve } from "../proving/internal/loadArtifactsAndProve";
import { resolveCircuitArtifacts } from "../proving/internal/resolveCircuitArtifacts";
import { buildAggregateRequest } from "./buildAggregateRequest";
import { attachSubmissionSugar } from "./internal/attachSugar";
import { fetchAggregatorFees } from "./internal/fetchAggregatorFees";
import { resolveRecipients } from "./internal/resolveRecipients";

vi.mock("../proving/internal/loadArtifactsAndProve", () => ({ loadArtifactsAndProve: vi.fn() }));
vi.mock("../proving/internal/resolveCircuitArtifacts", () => ({ resolveCircuitArtifacts: vi.fn() }));
vi.mock("./internal/attachSugar", () => ({ attachSubmissionSugar: vi.fn((_config, value) => value) }));
vi.mock("./internal/fetchAggregatorFees", () => ({ fetchAggregatorFees: vi.fn() }));
vi.mock("./internal/resolveRecipients", () => ({ resolveRecipients: vi.fn() }));
vi.mock("@/proving/groth16", () => ({ formatGroth16ProofForSolidity: vi.fn(() => ["proof"]) }));
vi.mock("@/proving/witnessFromNotes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/proving/witnessFromNotes")>()),
  buildAggregationWitnessBundle: vi.fn(),
  flattenAggregationCircuitInputs: vi.fn(() => []),
}));

const network = fixtureNetwork({
  aggregatorContractAddress: "0x00000000000000000000000000000000000000a1",
  vaultContractAddress: "0x00000000000000000000000000000000000000a2",
});

const note = (amount: bigint, token = 1n) =>
  new Note({
    amount,
    token,
    owner: { babyJubjubPublicKey: { x: 1n, y: 2n }, sharedSecret: 3n },
    ephemeralKey: [4n, 5n],
    viewTag: 6n,
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveCircuitArtifacts).mockReturnValue({ maxInputs: 2, maxOutputs: 3, treeDepth: 30 } as never);
  vi.mocked(fetchAggregatorFees).mockResolvedValue({
    protocolFeePerThousand: 0n,
    feeNotePublicKey: [8n, 9n],
    commitmentGasCosts: Array.from({ length: 64 }, (_, index) => (index === 1 ? 7n : 0n)),
  });
  vi.mocked(loadArtifactsAndProve).mockResolvedValue({ proof: {}, publicSignals: ["10", "11", "12", "13"] } as never);
});

describe("buildAggregateRequest", () => {
  it("builds a submit-ready payload from the contract fee snapshot", async () => {
    const input = note(100n);
    const recipient = note(80n);
    const feeNote = note(8n);
    vi.mocked(resolveRecipients).mockResolvedValue([recipient]);
    vi.mocked(buildAggregationWitnessBundle).mockResolvedValue({
      witness: {} as never,
      outputNotes: [recipient],
      feeNote,
    });
    const config = createFakeConfig({ networks: [network], activeNetworks: [network] });

    await buildAggregateRequest({
      config,
      networkSlug: network.slug,
      inputNotes: [input],
      ownerBjjPrivateKeyHex: "01",
      recipients: [{ note: recipient }],
    });

    expect(fetchAggregatorFees).toHaveBeenCalledWith(config, network.slug);
    expect(buildAggregationWitnessBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        inputNotes: [input],
        recipientNotes: [recipient],
        protocolFeePerThousand: 0n,
        gasFee: 7n,
        maxInputs: 2,
        maxOutputs: 3,
        treeDepth: 30,
      }),
    );
    expect(attachSubmissionSugar).toHaveBeenCalledWith(
      config,
      expect.objectContaining({
        action: "aggregation",
        networkSlug: network.slug,
        contractArg: 2,
        maxOutputs: 3,
        nullifiers: [10n, 11n],
        outputNoteIds: [12n, 13n],
      }),
    );
  });

  it("rejects a fee collector that does not match the deployed key", async () => {
    vi.mocked(resolveRecipients).mockResolvedValue([note(80n)]);
    vi.mocked(fetchAggregatorFees).mockResolvedValue({
      protocolFeePerThousand: 1n,
      feeNotePublicKey: [8n, 9n],
      commitmentGasCosts: new Array<bigint>(64).fill(0n),
    });
    const protocol = {
      proving: {
        aggregation: { treeDepth: 30, maxInputs: 2, maxOutputs: 3, batchSize: 5, groupFee: 1 },
        withdrawal: { treeDepth: 30, maxInputs: 2, maxOutputs: 0, batchSize: 5, groupFee: 1 },
        noteOwnership: { treeDepth: 0, maxInputs: 0, maxOutputs: 0, batchSize: 5, groupFee: 0 },
      },
      feeCollector: { S: "1", V: "2", babyJubjubPublicKey: "10.11" },
    };
    const config = createFakeConfig({ networks: [network], activeNetworks: [network], protocol });

    await expect(
      buildAggregateRequest({
        config,
        inputNotes: [note(100n)],
        ownerBjjPrivateKeyHex: "01",
        recipients: [{ note: note(80n) }],
      }),
    ).rejects.toBeInstanceOf(CommandError);
    expect(loadArtifactsAndProve).not.toHaveBeenCalled();
  });
});
