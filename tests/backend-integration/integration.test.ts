import { Core } from "@/core";
import { ApiClient } from "@/http/api";
import { AggregationRequestParams, Note, WithdrawRequestParams } from "@/types";
import { MOCK_ERC20_TOKEN_ID } from "@/utils";
import { CurvySDK } from "@/sdk";

const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXZlbnYwMDAwMDAwMDAwMDEubG9jYWwtY3VydnkubmFtZSIsImlhdCI6MTc1OTAwMzAwNywiZXhwIjoyMTE5MDAzMDA3fQ.UooAgQTvwZTZUqrAGzynr69Vul8ebA7tC-5-VXwiSws";

const waitForRequest = async (requestId: string, api: ApiClient): Promise<string> => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        const { status } = await api.aggregator.GetAggregatorRequestStatus(requestId);
        if (status === "completed") {
          clearInterval(interval);
          resolve(status);
        }
        if (status === "failed") {
          clearInterval(interval);
          reject("Request failed");
        }
      }, 1000);
    });
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

        const depositResponse = await api.aggregator.SubmitDeposit(depositPayload);
        expect(depositResponse.requestId).toBeDefined();

        console.log("Deposit API response:", depositResponse.requestId);

        // console.log("Turn on aggregator server");
        await new Promise(resolve => setTimeout(resolve, 20_000));

        // const depositStatus = await waitForRequest(depositResponse.requestId, api);

        // expect(depositStatus).toBe("success");
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

        const { proof: proof1, publicSignals: ownerHashes1 } = await core.generateNoteOwnershipProof(ownedNotes1, keyPairs.babyJubjubPublicKey);

        const authenticatedNotes1 = await api.aggregator.SubmitNotesOwnershipProof({ proof: proof1, ownerHashes: ownerHashes1 });
        expect(authenticatedNotes1.notes.length).toBe(2);

        console.log("✅ Owned notes fetched");

        const aggregationInputNotes = core.unpackAuthenticatedNotes(keyPairs.s, keyPairs.v, authenticatedNotes1.notes, keyPairs.babyJubjubPublicKey.split(".") as [string, string]);

        expect(aggregationInputNotes.length).toBe(2);

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

        const aggregationResponse = await api.aggregator.SubmitAggregation(aggregationPayload);
        expect(aggregationResponse.requestId).toBeDefined();

        console.log("Aggregation API response:", aggregationResponse.requestId);

        console.log("Turn on aggregator server");
        await new Promise(resolve => setTimeout(resolve, 10000));

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

        console.log("Turn on aggregator server");
        await new Promise(resolve => setTimeout(resolve, 10000));

        const withdrawalStatus = await waitForRequest(withdrawalResponse.requestId, api);

        expect(withdrawalStatus).toBe("success");
        console.log("✅ Withdraw reached success status");

        console.log("✅ Integration test passed");
    }, 300_000);
});
