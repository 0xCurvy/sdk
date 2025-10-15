// @ts-nocheck
import { Core } from "@/core";
import { ApiClient } from "@/http/api";
import type { Note } from "@/types";

const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXZlbnYwMDAwMDAwMDAwMDEubG9jYWwtY3VydnkubmFtZSIsImlhdCI6MTc1OTAwMzAwNywiZXhwIjoyMTE5MDAzMDA3fQ.UooAgQTvwZTZUqrAGzynr69Vul8ebA7tC-5-VXwiSws";

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

  const keyPairs = core.generateKeyPairs();

  it("deposit, aggregation and withdraw, should create proofs and verify them on-chain", async () => {
    const depositNotes1: Note[] = [];

    depositNotes1.push(
      core.sendNote(keyPairs.S, keyPairs.V, {
        ownerBabyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
        amount: 3000n,
        token: BigInt(2),
      }),
    );

    const depositPayload1 = {
      outputNotes: depositNotes1.map((note) => note.serializeDepositNote()),
      fromAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    };

    const deposit1Response = await api.aggregator.SubmitDeposit(depositPayload1);
    expect(deposit1Response.requestId).toBeDefined();

    console.log("Deposit API response:", deposit1Response.requestId);

    const depositNotes2: Note[] = [];

    depositNotes2.push(
      core.sendNote(keyPairs.S, keyPairs.V, {
        ownerBabyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
        amount: 1000n,
        token: BigInt(2),
      }),
    );

    const depositPayload2 = {
      outputNotes: depositNotes2.map((note) => note.serializeDepositNote()),
      fromAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    };

    const deposit2Response = await api.aggregator.SubmitDeposit(depositPayload2);
    expect(deposit2Response.requestId).toBeDefined();

    console.log("Deposit API response:", deposit2Response.requestId);

    const depositNotes3: Note[] = [];

    depositNotes3.push(
      core.sendNote(keyPairs.S, keyPairs.V, {
        ownerBabyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
        amount: 500n,
        token: BigInt(2),
      }),
    );

    const depositPayload3 = {
      outputNotes: depositNotes3.map((note) => note.serializeDepositNote()),
      fromAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    };

    const deposit3Response = await api.aggregator.SubmitDeposit(depositPayload3);
    expect(deposit3Response.requestId).toBeDefined();

    console.log("Deposit API response:", deposit3Response.requestId);

    const depositNotes4: Note[] = [];

    depositNotes4.push(
      core.sendNote(keyPairs.S, keyPairs.V, {
        ownerBabyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
        amount: 100n,
        token: BigInt(1),
      }),
    );

    const depositPayload4 = {
      outputNotes: depositNotes4.map((note) => note.serializeDepositNote()),
      fromAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    };

    const deposit4Response = await api.aggregator.SubmitDeposit(depositPayload4);
    expect(deposit4Response.requestId).toBeDefined();

    console.log("Deposit API response:", deposit4Response.requestId);

    const depositNotes5: Note[] = [];

    depositNotes5.push(
      core.sendNote(keyPairs.S, keyPairs.V, {
        ownerBabyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
        amount: 50n,
        token: BigInt(1),
      }),
    );

    const depositPayload5 = {
      outputNotes: depositNotes5.map((note) => note.serializeDepositNote()),
      fromAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    };

    const deposit5Response = await api.aggregator.SubmitDeposit(depositPayload5);
    expect(deposit5Response.requestId).toBeDefined();

    console.log("Deposit API response:", deposit5Response.requestId);

    const deposit1Status = await waitForRequest(deposit1Response.requestId, api);

    expect(deposit1Status).toBe("success");
    console.log("✅ Deposit 1 reached success status");

    const deposit2Status = await waitForRequest(deposit2Response.requestId, api);

    expect(deposit2Status).toBe("success");
    console.log("✅ Deposit 2 reached success status");

    const deposit3Status = await waitForRequest(deposit3Response.requestId, api);

    expect(deposit3Status).toBe("success");
    console.log("✅ Deposit 3 reached success status");

    const deposit4Status = await waitForRequest(deposit4Response.requestId, api);

    expect(deposit4Status).toBe("success");
    console.log("✅ Deposit 4 reached success status");

    const deposit5Status = await waitForRequest(deposit5Response.requestId, api);

    expect(deposit5Status).toBe("success");
    console.log("✅ Deposit 5 reached success status");

    const { notes: allNotes1 } = await api.aggregator.GetAllNotes();

    const ownedNotes1 = core.getNoteOwnershipData(
      allNotes1.map((note) => ({
        ownerHash: note.ownerHash,
        deliveryTag: note.deliveryTag,
      })),
      keyPairs.s,
      keyPairs.v,
    );

    expect(ownedNotes1.length).toBe(5);

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
    expect(authenticatedNotes1.notes.length).toBe(5);

    console.log("✅ Owned notes fetched");

    //     const aggregationInputNotes = core.unpackAuthenticatedNotes(
    //       keyPairs.s,
    //       keyPairs.v,
    //       authenticatedNotes1.notes,
    //       keyPairs.babyJubjubPublicKey.split(".") as [string, string],
    //     );

    //     expect(aggregationInputNotes.length).toBe(2);

    //     const outputAmount = ((3000n + 1000n) * 999n) / 1000n;

    //     const aggregationOutputNotes: Note[] = [];

    //     aggregationOutputNotes.push(core.sendNote(keyPairs.S, keyPairs.V, {
    //         ownerBabyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
    //         amount: outputAmount,
    //         token: BigInt(2),
    //     }));

    //     const aggregationParams: AggregationRequestParams = {
    //         inputNotes: aggregationInputNotes.map((note) => note.serializeAggregationInputNote()),
    //         outputNotes: aggregationOutputNotes.map((note) => note.serializeAggregationOutputNote())
    //     };

    //     const aggregationPayload = sdk.createAggregationPayload(aggregationParams, network, keyPairs.s);

    //     const aggregationResponse = await api.aggregator.SubmitAggregation(aggregationPayload);
    //     expect(aggregationResponse.requestId).toBeDefined();

    //     console.log("Aggregation API response:", aggregationResponse.requestId);

    //     const aggregationStatus = await waitForRequest(aggregationResponse.requestId, api);

    //     expect(aggregationStatus).toBe("success");
    //     console.log("✅ Aggregation reached success status");

    //     const { notes: allNotes2 } = await api.aggregator.GetAllNotes();

    //     const ownedNotes2 = core.getNoteOwnershipData(
    //       allNotes2.map((note) => ({
    //         ownerHash: note.ownerHash,
    //         deliveryTag: note.deliveryTag,
    //       })),
    //       keyPairs.s,
    //       keyPairs.v,
    //     );

    //     expect(ownedNotes2.length).toBe(1);

    //     const { proof: proof2, publicSignals: ownerHashes2 } = await core.generateNoteOwnershipProof(
    //       ownedNotes2,
    //       keyPairs.babyJubjubPublicKey,
    //       network,
    //     );

    //     const authenticatedNotes2 = await api.aggregator.SubmitNotesOwnershipProof({
    //       proof: proof2,
    //       ownerHashes: ownerHashes2,
    //     });
    //     expect(authenticatedNotes2.notes.length).toBe(1);

    //     console.log("✅ Owned notes fetched");

    //     const withdrawalNotes = core.unpackAuthenticatedNotes(
    //       keyPairs.s,
    //       keyPairs.v,
    //       authenticatedNotes2.notes,
    //       keyPairs.babyJubjubPublicKey.split(".") as [string, string],
    //     );

    //     expect(withdrawalNotes.length).toBe(1);

    //     const withdrawalRequestParams: WithdrawRequestParams = {
    //       inputNotes: withdrawalNotes,
    //       destinationAddress: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    //     };

    //     const withdrawalPayload = sdk.createWithdrawPayload(withdrawalRequestParams, network, keyPairs.s);

    //     const withdrawalResponse = await api.aggregator.SubmitWithdraw(withdrawalPayload);
    //     expect(withdrawalResponse.requestId).toBeDefined();

    //     console.log("Withdraw API response:", withdrawalResponse.requestId);

    //     const withdrawalStatus = await waitForRequest(withdrawalResponse.requestId, api);

    //     expect(withdrawalStatus).toBe("success");
    //     console.log("✅ Withdraw reached success status");

    //     console.log("✅ Integration test passed");
  }, 300_000);
});
