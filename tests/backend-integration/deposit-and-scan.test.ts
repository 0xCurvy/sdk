import { expect, test } from "vitest";
import { Core } from "@/core";
import { ApiClient } from "@/http/api.js";
import { AggregatorRequestStatus } from "@/types/aggregator";

const BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzZGt0ZXN0LnN0YWdpbmctY3VydnkubmFtZSIsImlhdCI6MTc1NTg2Nzk5NiwiZXhwIjoyMTE1ODY3OTk2fQ.jl6KWZHGPVwIozMsgkSYNlxNUur0G4VtoP7WU-XoWUk";

// @ts-ignore
const waitForRequest = async (requestId: string, api: ApiClient) => {
    return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
            const { status } = await api.aggregator.GetAggregatorRequestStatus(requestId);
            if (status === AggregatorRequestStatus.SUCCESS) {
                clearInterval(interval);
                resolve(status);
            }
            if (status === AggregatorRequestStatus.FAILED) {
                clearInterval(interval);
                reject("Request failed");
            }
        }, 1000);
  })
}

const serializeAsJSObject = (obj: any) => {
    function preprocess(value: any): any {
      if (typeof value === "bigint") {
        if (value === BigInt("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"))
          return "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        return value.toString();
      } else if (Array.isArray(value)) {
        return value.map(preprocess);
      } else if (value && typeof value === "object") {
        const newObj: any = {};
        for (const key in value) {
          newObj[key] = preprocess(value[key]);
        }
        return newObj;
      } else {
        return value;
      }
    }
  
    const processed = preprocess(obj);
  
    return processed;
  };

test("should generate note, deposit and scan", async () => {
  const NUM_NOTES = 2;
  const core = await Core.init();

  const keyPairs = core.generateKeyPairs();
  const { bJJPublicKey } = core.getCurvyKeys(keyPairs.s, keyPairs.v);

  const rawNotes: any[] = [];
  const outputNotes: any[] = [];

  for (let i = 0; i < NUM_NOTES; i++) {
    const note = core.sendNote(keyPairs.S, keyPairs.V, {
      ownerBabyJubPublicKey: bJJPublicKey,
      amount: 1000000000000000000n,
      token: BigInt("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"),
    });

    rawNotes.push(note);

    outputNotes.push(core.generateOutputNote(note));
  }

  const api = new ApiClient(
    "local",
    "http://localhost:4000",
  );

  const depositPayload = serializeAsJSObject({
    outputNotes,
    csucAddress: "0x0000000000000000000000000000000000000000000000000000000000000123",
    csucTransferAllowanceSignature: "0x0000000000000000000000000000000000000000000000000000000000000123",
  });

  api.updateBearerToken(BEARER_TOKEN);
  const res = await api.aggregator.SubmitDeposit(depositPayload);
  expect(res.requestId).toBeDefined();

  // await waitForRequest(res.requestId, api);

  const allNotes = await api.aggregator.GetAllNotes();

  const ownedNotes = core.filterOwnedNotes(allNotes.notes.map((note) => ({
    ownerHash: note.ownerHash,
    ephemeralKey: note.ephemeralKey,
    viewTag: note.viewTag.slice(2),
  })), keyPairs.s, keyPairs.v);

  expect(ownedNotes.length).toBe(NUM_NOTES);

  for (let i = 0; i < rawNotes.length; i++) {
    const { sharedSecret } = ownedNotes[i];
    const noteSharedSecret = rawNotes[i].owner.sharedSecret;
    expect(sharedSecret.toString()).toBe(noteSharedSecret.toString());
  }

  const { proof, publicSignals: ownerHashes } = await core.generateNoteOwnershipProof(ownedNotes, bJJPublicKey);

  const authenticatedNotes = await api.aggregator.SubmitNotesOwnerhipProof({ proof, ownerHashes });

  expect(authenticatedNotes.notes.length).toBe(NUM_NOTES);

  const unpackedNotes = core.unpackAuthenticatedNotes(keyPairs.s, keyPairs.v, authenticatedNotes.notes, bJJPublicKey.split(".") as [string, string]);

  expect(unpackedNotes.length).toBe(NUM_NOTES);

  for (let i = 0; i < unpackedNotes.length; i++) {
    const note = unpackedNotes[i];
    const rawNote = rawNotes[i];

    expect(note.owner.babyJubPublicKey).toEqual(rawNote.owner.babyJubPublicKey);
    expect(note.owner.sharedSecret).toEqual(rawNote.owner.sharedSecret);
    expect(note.amount).toBe(rawNote.amount);
    expect(note.token).toBe("0x" + BigInt(rawNote.token).toString(16));
    expect(note.viewTag.slice(2)).toBe(rawNote.viewTag);
    expect(note.ephemeralKey).toBe(rawNote.ephemeralKey);
  }
}, 10_000);
