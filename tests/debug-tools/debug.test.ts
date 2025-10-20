import { buildEddsa, type Eddsa } from "circomlibjs";
import { Core } from "../../src/core";
import { poseidonHash } from "../../src/utils/poseidon-hash";
import inputData from "./debug-input.example.json";

type Signature = {
  S: bigint;
  R8: bigint[];
};

type Point = [bigint, bigint];

type PublicNote = {
  ownerHash: string;
  deliveryTag: {
    ephemeralKey: string;
    viewTag: string;
  };
};

const getNoteOwnershipData = async (
  publicNotes: PublicNote[],
  s: string,
  v: string,
  ownerBabyJubjubPublicKey: string,
) => {
  const core = await Core.init();
  const scanResult = core.scanNotes(
    s,
    v,
    publicNotes.map(({ deliveryTag }) => deliveryTag),
  );

  const sharedSecrets = scanResult.spendingPubKeys.map((pubKey: string) =>
    pubKey.length > 0 ? BigInt(pubKey.split(".")[0]) : null,
  );

  const bjjKeyBigint = ownerBabyJubjubPublicKey.split(".").map(BigInt);

  const ownershipData: any[] = [];

  for (let i = 0; i < publicNotes.length; i++) {
    const sharedSecret = sharedSecrets[i];

    if (sharedSecret !== null) {
      const computedHash = poseidonHash([...bjjKeyBigint, sharedSecrets[i]!]).toString();
      if (computedHash === publicNotes[i].ownerHash) {
        ownershipData.push({
          ownerHash: publicNotes[i].ownerHash,
          sharedSecret,
        });
      }
    }
  }

  return ownershipData;
};

const verifySignature = (
  message: bigint,
  signatureRaw: Signature,
  babyJubjubPublicKey: { x: string; y: string },
  eddsa: Eddsa,
): boolean => {
  const coordsToPoint = ([x, y]: bigint[], eddsa: any): Point => {
    return [eddsa.F.e(x), eddsa.F.e(y)];
  };

  const msgBuffer = eddsa.babyJub.F.e(message);

  const signature: any = {
    R8: coordsToPoint(signatureRaw.R8, eddsa),
    S: signatureRaw.S,
  };

  const babyJubjubPublicKeyPoint = coordsToPoint([BigInt(babyJubjubPublicKey.x), BigInt(babyJubjubPublicKey.y)], eddsa);
  if (eddsa.verifyPoseidon(msgBuffer, signature, babyJubjubPublicKeyPoint as any)) {
    return true;
  }

  return false;
};

test("poseidonHash", () => {
  const hash = poseidonHash(inputData.poseidonHash.args.map(BigInt));
  expect(hash).toBeDefined();
  console.log("Poseidon Hash");
  console.log("================================");
  console.log("Args: ", inputData.poseidonHash.args);
  console.log("--------------------------------");
  console.log("Hash (dec): ", hash.toString());
  console.log("Hash (hex): ", "0x" + hash.toString(16));
  console.log("--------------------------------");
});

test("ownerHash", () => {
  const {
    babyJubPubKey: { x, y },
    sharedSecret,
  } = inputData.ownerHash;

  console.log("x: ", x);
  console.log("y: ", y);
  console.log("sharedSecret: ", sharedSecret);

  const hash = poseidonHash([x, y, sharedSecret].map(BigInt));
  expect(hash).toBeDefined();
  console.log("Owner Hash");
  console.log("================================");
  console.log("x:", x);
  console.log("y:", y);
  console.log("sharedSecret:", sharedSecret);
  console.log("--------------------------------");
  console.log("Hash (dec): ", hash.toString());
  console.log("Hash (hex): ", "0x" + hash.toString(16));
  console.log("--------------------------------");
});

test("noteHash", () => {
  const {
    owner: {
      babyJubPubKey: { x, y },
      sharedSecret,
    },
    amount,
    token,
  } = inputData.noteHash;

  const ownerHash = poseidonHash([x, y, sharedSecret].map(BigInt));
  const noteHash = poseidonHash([ownerHash, amount, token].map(BigInt));
  expect(noteHash).toBeDefined();
  console.log("Note Hash");
  console.log("================================");
  console.log("x:", x);
  console.log("y:", y);
  console.log("sharedSecret:", sharedSecret);
  console.log("amount:", amount);
  console.log("token:", token);
  console.log("--------------------------------");
  console.log("Note Hash (dec): ", noteHash.toString());
  console.log("Note Hash (hex): ", "0x" + noteHash.toString(16));
  console.log("--------------------------------");
});

test("nullifier", () => {
  const {
    babyJubPubKey: { x, y },
    sharedSecret,
  } = inputData.nullifier;

  const nullifier = poseidonHash([sharedSecret, x, y].map(BigInt));
  expect(nullifier).toBeDefined();
  console.log("Nullifier");
  console.log("================================");
  console.log("x:", x);
  console.log("y:", y);
  console.log("sharedSecret:", sharedSecret);
  console.log("--------------------------------");
  console.log("Nullifier (dec): ", nullifier.toString());
  console.log("Nullifier (hex): ", "0x" + nullifier.toString(16));
  console.log("--------------------------------");
});

test("verifySignature", async () => {
  const eddsa = await buildEddsa();
  const { signature, message, babyJubPubKey } = inputData.verifySignature;

  const verified = verifySignature(
    BigInt(message),
    {
      S: BigInt(signature.S),
      R8: signature.R8.map(BigInt),
    },
    babyJubPubKey,
    eddsa,
  );
  expect(verified).toBeDefined();
  console.log("Verify Signature");
  console.log("================================");
  console.log("x:", babyJubPubKey.x);
  console.log("y:", babyJubPubKey.y);
  console.log("S:", signature.S);
  console.log("R8:", signature.R8);
  console.log("Message:", message);
  console.log("--------------------------------");
  console.log("Message: ", message);
  console.log("Verified: ", verified);
  console.log("--------------------------------");
});

test("scanNote", async () => {
  const core = await Core.init();
  const { s, v, ephemeralKey, viewTag } = inputData.scanNote;

  const note = await core.scanNotes(s, v, [{ ephemeralKey, viewTag }]);

  expect(note).toBeDefined();
  console.log("Scan Note");
  console.log("================================");
  console.log("s:", s);
  console.log("v:", v);
  console.log("ephemeralKey:", ephemeralKey);
  console.log("viewTag:", viewTag);
  console.log("--------------------------------");
  console.log("Note: ", note);
  console.log("--------------------------------");
});

test("noteOwnershipData", async () => {
  const { s, v, ownerbabyJubjubPublicKey, publicNote } = inputData.noteOwnershipData;

  const noteOwnershipData = await getNoteOwnershipData([publicNote], s, v, ownerbabyJubjubPublicKey);

  expect(noteOwnershipData).toBeDefined();
  console.log("Scan Note");
  console.log("================================");
  console.log("s:", s);
  console.log("v:", v);
  console.log("babyJubjubPublicKey:", ownerbabyJubjubPublicKey);
  console.log("publicNote:", publicNote);
  console.log("--------------------------------");
  console.log("Note Ownership Data: ", noteOwnershipData);
  console.log("--------------------------------");
});
