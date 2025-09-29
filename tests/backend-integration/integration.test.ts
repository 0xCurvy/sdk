import { Core } from "@/core";
import { ApiClient } from "@/http/api";
import { AggregationRequestParams, Note, WithdrawRequestParams } from "@/types";
import { MOCK_ERC20_TOKEN_ID } from "@/utils";
import { CurvySDK } from "@/sdk";

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
    const sdk = await CurvySDK.init("local", undefined, "http://localhost:4000");

    const keyPairs = core.generateKeyPairs();

    it("deposit, aggregation and withdraw, should create proofs and verify them on-chain", async () => {
        const depositNotes: Note[] = [];

        depositNotes.push(core.sendNote(keyPairs.S, keyPairs.V, {
            ownerBabyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
            amount: 3000n,
            token: BigInt(MOCK_ERC20_TOKEN_ID),
        }));

        depositNotes.push(core.sendNote(keyPairs.S, keyPairs.V, {
            ownerBabyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
            amount: 1000n,
            token: BigInt(MOCK_ERC20_TOKEN_ID),
        }));

        const depositPayload = {
            outputNotes: depositNotes.map((note) => note.serializeDepositNote()),
            fromAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        };

        console.log("DEPOSIT NOTES");
        console.dir(depositNotes, { depth: null });
        for (let i = 0; i < depositNotes.length; i++) {
            console.log("NOTE ID", depositNotes[i].id);
        }

        const depositResponse = await api.aggregator.SubmitDeposit(depositPayload);
        expect(depositResponse.requestId).toBeDefined();

        console.log("Deposit API response:", depositResponse.requestId);

        const depositStatus = await waitForRequest(depositResponse.requestId, api);

        expect(depositStatus).toBe("success");
        console.log("✅ Deposit reached success status");

        const { notes: allNotes1 } = await api.aggregator.GetAllNotes();

        console.log("ALL NOTES");
        console.dir(allNotes1, { depth: null });

        const ownedNotes1 = core.getNoteOwnershipData(
            allNotes1.map((note) => ({
              ownerHash: note.ownerHash,
              deliveryTag: note.deliveryTag,
            })),
            keyPairs.s,
            keyPairs.v,
        );

        console.log("OWNED NOTES");
        console.dir(ownedNotes1, { depth: null });

        expect(ownedNotes1.length).toBe(2);

        const { proof: proof1, publicSignals: ownerHashes1 } = await core.generateNoteOwnershipProof(ownedNotes1, keyPairs.babyJubjubPublicKey);

        const authenticatedNotes1 = await api.aggregator.SubmitNotesOwnershipProof({ proof: proof1, ownerHashes: ownerHashes1 });
        expect(authenticatedNotes1.notes.length).toBe(2);

        console.log("AUTHENTICATED NOTES");
        console.dir(authenticatedNotes1, { depth: null });

        console.log("✅ Owned notes fetched");

        const aggregationInputNotes = core.unpackAuthenticatedNotes(keyPairs.s, keyPairs.v, authenticatedNotes1.notes, keyPairs.babyJubjubPublicKey.split(".") as [string, string]);

        expect(aggregationInputNotes.length).toBe(2);

        console.log("AGGREGATION INPUT NOTES");
        console.dir(aggregationInputNotes, { depth: null });
        for (let i = 0; i < aggregationInputNotes.length; i++) {
            console.log("NOTE ID", aggregationInputNotes[i].id);
        }

        const outputAmount = (3000n + 1000n) * 999n / 1000n;

        const aggregationOutputNotes: Note[] = [];

        aggregationOutputNotes.push(core.sendNote(keyPairs.S, keyPairs.V, {
            ownerBabyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
            amount: outputAmount,
            token: BigInt(MOCK_ERC20_TOKEN_ID),
        }));
        
        const aggregationParams: AggregationRequestParams = {
            inputNotes: aggregationInputNotes.map((note) => note.serializeAggregationInputNote()),
            outputNotes: aggregationOutputNotes.map((note) => note.serializeAggregationOutputNote())
        };

        const aggregationPayload = sdk.createAggregationPayload(aggregationParams, keyPairs.s);

        console.log("AGGREGATION PAYLOAD");
        console.dir(aggregationPayload, { depth: null });

        const aggregationResponse = await api.aggregator.SubmitAggregation(aggregationPayload);
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

        const { proof: proof2, publicSignals: ownerHashes2 } = await core.generateNoteOwnershipProof(ownedNotes2, keyPairs.babyJubjubPublicKey);

        const authenticatedNotes2 = await api.aggregator.SubmitNotesOwnershipProof({ proof: proof2, ownerHashes: ownerHashes2 });
        expect(authenticatedNotes2.notes.length).toBe(1);

        console.log("✅ Owned notes fetched");

        const withdrawalNotes = core.unpackAuthenticatedNotes(keyPairs.s, keyPairs.v, authenticatedNotes2.notes, keyPairs.babyJubjubPublicKey.split(".") as [string, string]);

        expect(withdrawalNotes.length).toBe(1);

        const withdrawalRequestParams: WithdrawRequestParams = {
            inputNotes: withdrawalNotes,
            destinationAddress: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"
        };

        const withdrawalPayload = sdk.createWithdrawPayload(withdrawalRequestParams, keyPairs.s);

        const withdrawalResponse = await api.aggregator.SubmitWithdraw(withdrawalPayload);
        expect(withdrawalResponse.requestId).toBeDefined();

        console.log("Withdraw API response:", withdrawalResponse.requestId);

        const withdrawalStatus = await waitForRequest(withdrawalResponse.requestId, api);

        expect(withdrawalStatus).toBe("success");
        console.log("✅ Withdraw reached success status");

        console.log("✅ Integration test passed");
    }, 300_000);
});
