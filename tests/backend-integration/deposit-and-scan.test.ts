import { expect, test } from "vitest";
import { Core } from "@/core";
import { ApiClient } from "@/http/api.js";
import { Note } from "@/types/note";

const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzZGt0ZXN0LnN0YWdpbmctY3VydnkubmFtZSIsImlhdCI6MTc1NTg2Nzk5NiwiZXhwIjoyMTE1ODY3OTk2fQ.jl6KWZHGPVwIozMsgkSYNlxNUur0G4VtoP7WU-XoWUk";

// @ts-expect-error
const waitForRequest = async (requestId: string, api: ApiClient) => {
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
  const { babyJubjubPublicKey } = core.getCurvyKeys(keyPairs.s, keyPairs.v);

  const rawNotes: any[] = [];
  const outputNotes: any[] = [];

  for (let i = 0; i < NUM_NOTES; i++) {
    const note = core.sendNote(keyPairs.S, keyPairs.V, {
      ownerBabyJubjubPublicKey: babyJubjubPublicKey,
      amount: 1000000000000000000n,
      token: BigInt("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"),
    });

    rawNotes.push(note);

    outputNotes.push(note.serializeDepositNote());
  }

  const api = new ApiClient("local", "http://localhost:4000");

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

  const ownedNotes = core.getNoteOwnershipData(
    allNotes.notes.map((note) => ({
      ownerHash: note.ownerHash,
      ephemeralKey: note.ephemeralKey,
      viewTag: note.viewTag.slice(2),
    })),
    keyPairs.s,
    keyPairs.v,
  );

  expect(ownedNotes.length).toBe(NUM_NOTES);

  for (let i = 0; i < rawNotes.length; i++) {
    const { sharedSecret } = ownedNotes[i];
    const noteSharedSecret = rawNotes[i].owner.sharedSecret;
    expect(sharedSecret.toString()).toBe(noteSharedSecret.toString());
  }

  const { proof, publicSignals: ownerHashes } = await core.generateNoteOwnershipProof(ownedNotes, babyJubjubPublicKey);

  const authenticatedNotes = await api.aggregator.SubmitNotesOwnerhipProof({ proof, ownerHashes });

  expect(authenticatedNotes.notes.length).toBe(NUM_NOTES);

  const notes = authenticatedNotes.notes.map(
    (note) =>
      new Note({
        ownerHash: BigInt(note.ownerHash),
        balance: {
          amount: BigInt(note.amount),
          token: BigInt(note.token),
        },
        deliveryTag: {
          ephemeralKey: BigInt(note.ephemeralKey),
          viewTag: BigInt(note.viewTag),
        },
      }),
  );

  const unpackedNotes = core.unpackAuthenticatedNotes(
    keyPairs.s,
    keyPairs.v,
    notes,
    babyJubjubPublicKey.split(".") as [string, string],
  );

  expect(unpackedNotes.length).toBe(NUM_NOTES);

  for (let i = 0; i < unpackedNotes.length; i++) {
    const note = unpackedNotes[i];
    const rawNote = rawNotes[i];

    expect(note.owner!.babyJubjubPublicKey).toEqual(rawNote.owner.babyJubjubPublicKey);
    expect(note.owner!.sharedSecret).toEqual(rawNote.owner.sharedSecret);
    expect(note.balance!.amount).toBe(rawNote.amount);
    expect(note.balance!.token).toBe(rawNote.token);
    expect(note.deliveryTag!.viewTag).toBe(rawNote.viewTag);
    expect(note.deliveryTag!.ephemeralKey).toBe(rawNote.ephemeralKey);
  }
}, 10_000);
