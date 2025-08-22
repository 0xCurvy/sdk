import { expect, test } from "vitest";
import { Core } from "@/core";
import { buildPoseidon } from "circomlibjs";
import { ApiClient } from "@/http/api.js";

const BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzZGt0ZXN0LnN0YWdpbmctY3VydnkubmFtZSIsImlhdCI6MTc1NTg2Nzk5NiwiZXhwIjoyMTE1ODY3OTk2fQ.jl6KWZHGPVwIozMsgkSYNlxNUur0G4VtoP7WU-XoWUk";

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

test.skip("should generate note, deposit and scan", async () => {
  const NUM_NOTES = 2;
  const core = await Core.init();

  const keyPairs = core.generateKeyPairs();
  const { bJJPublicKey } = core.getCurvyKeys(keyPairs.s, keyPairs.v);

  const outputNotes: any[] = [];

  const poseidon = await buildPoseidon();   
  for (let i = 0; i < NUM_NOTES; i++) {
    const note = core.sendNote(keyPairs.S, keyPairs.V, {
      ownerBabyJubPublicKey: bJJPublicKey,
      amount: 1000000000000000000n,
      token: BigInt("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"),
    });

    outputNotes.push({
      ownerHash: poseidon.F.toObject(
        poseidon([...note.owner.babyJubPublicKey, note.owner.sharedSecret])
      ),
      amount: note.amount,
      token: note.token,
      ephemeralKey: note.ephemeralKey,
      viewTag: note.viewTag,
    });
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
});
