import { Core } from "@/core";
import { ApiClient } from "@/http/api";
import { CurvySDK } from "@/sdk";
import type { HexString, OutputNote } from "@/types";

const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXZlbnYwMDAwMDAwMDAwMDEubG9jYWwtY3VydnkubmFtZSIsImlhdCI6MTc2MDQyMzYxNywiZXhwIjoyMTIwNDIzNjE3fQ.JFCUQ-6ncOn42O3fJsffbzEr7BJ6qJTqmI-nCEdp2sU";

const waitForRequest = async (requestId: string, api: ApiClient, maxRetries = 20, delayMs = 5_000) => {
  for (let i = 0; i < maxRetries; i++) {
    const { status } = await api.aggregator.GetAggregatorRequestStatus(requestId);

    console.log(`Polling request ${requestId} status:`, status);

    if (status === "success") {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Polling failed for request ${requestId}: status never became success`);
};

describe("Integration test", async () => {
  const api = new ApiClient("local", "http://localhost:4000");
  api.updateBearerToken(BEARER_TOKEN);

  const core = await Core.init();
  const sdk = await CurvySDK.init("local", undefined, "http://localhost:4000");

  const keyPairs = core.generateKeyPairs();

  it("deposit, aggregation and withdraw, should create proofs and verify them on-chain", async () => {
    try {
      await sdk.resetAggregator();
    } catch (error) {
      console.log(error);
    }

    console.log("✅ Aggregator reset");

    const depositNotes1 = [];

    depositNotes1.push(
      core
        .sendNote(keyPairs.S, keyPairs.V, {
          ownerBabyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
          amount: 3000n,
          token: BigInt(2),
        })
        .serializeOutputNote(),
    );

    const depositPayload1 = {
      outputNotes: depositNotes1,
      fromAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" as HexString,
    };

    const depositResponse1 = await api.aggregator.SubmitDeposit(depositPayload1);
    if (depositResponse1.error) {
      console.log(depositResponse1.error);
    }
    expect(depositResponse1.requestId).toBeDefined();

    console.log("Deposit 1 API response:", depositResponse1.requestId);

    const depositNotes2 = [];

    depositNotes2.push(
      core
        .sendNote(keyPairs.S, keyPairs.V, {
          ownerBabyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
          amount: 1000n,
          token: BigInt(2),
        })
        .serializeOutputNote(),
    );

    const depositPayload2 = {
      outputNotes: depositNotes2,
      fromAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" as HexString,
    };

    const depositResponse2 = await api.aggregator.SubmitDeposit(depositPayload2);
    if (depositResponse2.error) {
      console.log(depositResponse2.error);
    }
    expect(depositResponse2.requestId).toBeDefined();

    console.log("Deposit 2 API response:", depositResponse2.requestId);

    const depositStatus1 = await waitForRequest(depositResponse1.requestId, api);
    expect(depositStatus1).toBe("success");

    const depositStatus2 = await waitForRequest(depositResponse2.requestId, api);
    expect(depositStatus2).toBe("success");

    console.log("✅ Deposit reached success status");

    const { notes: allNotes1 } = await api.aggregator.GetAllNotes();

    const ownedNotes1 = core.getNoteOwnershipData(
      allNotes1.map((note) => ({
        ownerHash: note.ownerHash,
        deliveryTag: note.deliveryTag,
      })),
      keyPairs.s,
      keyPairs.v,
    );

    expect(ownedNotes1.length).toBe(2);

    const networks = await api.network.GetNetworks();

    const network = networks.find((network) => network.name === "Localnet");
    if (!network) {
      throw new Error("Network not found");
    }

    const { proof: proof1, publicSignals: ownerHashes1 } = await core.generateNoteOwnershipProof(
      ownedNotes1,
      keyPairs.babyJubjubPublicKey,
    );

    const authenticatedNotes1 = await api.aggregator.SubmitNotesOwnershipProof({
      proof: proof1,
      ownerHashes: ownerHashes1,
    });
    expect(authenticatedNotes1.notes.length).toBe(2);

    console.log("✅ Owned notes fetched");

    const aggregationInputNotes = core.unpackAuthenticatedNotes(
      keyPairs.s,
      keyPairs.v,
      authenticatedNotes1.notes,
      keyPairs.babyJubjubPublicKey.split(".") as [string, string],
    );

    expect(aggregationInputNotes.length).toBe(2);

    const outputAmount = ((3000n + 1000n) * 999n) / 1000n;

    const aggregationOutputNotes: OutputNote[] = [];

    aggregationOutputNotes.push(
      core
        .sendNote(keyPairs.S, keyPairs.V, {
          ownerBabyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
          amount: outputAmount,
          token: BigInt(2),
        })
        .serializeOutputNote(),
    );

    const aggregationPayload = sdk.createAggregationPayload(
      aggregationInputNotes.map((note) => note.serializeInputNote()),
      aggregationOutputNotes,
      network,
      keyPairs.s,
    );

    const aggregationResponse = await api.aggregator.SubmitAggregation(aggregationPayload);
    if (aggregationResponse.error) {
      console.log(aggregationResponse.error);
    }
    expect(aggregationResponse.requestId).toBeDefined();

    console.log("Aggregation API response:", aggregationResponse.requestId);

    const aggregationStatus = await waitForRequest(aggregationResponse.requestId, api);

    expect(aggregationStatus).toBe("success");
    console.log("✅ Aggregation reached success status");

    const { notes: allNotes2 } = await api.aggregator.GetAllNotes();

    const ownedNotes2 = core.getNoteOwnershipData(
      allNotes2.map((note) => ({
        ownerHash: note.ownerHash,
        deliveryTag: note.deliveryTag,
      })),
      keyPairs.s,
      keyPairs.v,
    );

    expect(ownedNotes2.length).toBe(1);

    const { proof: proof2, publicSignals: ownerHashes2 } = await core.generateNoteOwnershipProof(
      ownedNotes2,
      keyPairs.babyJubjubPublicKey,
    );

    const authenticatedNotes2 = await api.aggregator.SubmitNotesOwnershipProof({
      proof: proof2,
      ownerHashes: ownerHashes2,
    });
    expect(authenticatedNotes2.notes.length).toBe(1);

    console.log("✅ Owned notes fetched");

    const withdrawalNotes = core.unpackAuthenticatedNotes(
      keyPairs.s,
      keyPairs.v,
      authenticatedNotes2.notes,
      keyPairs.babyJubjubPublicKey.split(".") as [string, string],
    );

    expect(withdrawalNotes.length).toBe(1);

    const destinationAddress: HexString = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc";
    const withdrawalPayload = sdk.createWithdrawPayload(
      withdrawalNotes.map((note) => note.serializeInputNote()),
      destinationAddress,
      network,
      keyPairs.s,
    );

    console.log(withdrawalPayload);

    const withdrawalResponse = await api.aggregator.SubmitWithdraw(withdrawalPayload);
    if (withdrawalResponse.error) {
      console.log(withdrawalResponse.error);
    }
    expect(withdrawalResponse.requestId).toBeDefined();

    console.log("Withdraw API response:", withdrawalResponse.requestId);

    const withdrawalStatus = await waitForRequest(withdrawalResponse.requestId, api);

    expect(withdrawalStatus).toBe("success");
    console.log("✅ Withdraw reached success status");

    console.log("✅ Integration test passed");
  }, 300_000);
});
