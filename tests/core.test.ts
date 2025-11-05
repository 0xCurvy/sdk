import { buildPoseidon } from "circomlibjs";
import { poseidon1, poseidon2, poseidon3 } from "poseidon-lite";
import { expect, test } from "vitest";
import { Core } from "@/core";
import { mockPopulateAnnouncement } from "./utils/announcement-filler";

test("should generate new Curvy keypairs", async () => {
  const core = new Core();

  const keyPairs = await core.generateKeyPairs();

  expect(keyPairs.s.length).toBe(64);
  expect(keyPairs.S.length).toBeGreaterThanOrEqual(152);
  expect(keyPairs.S.length).toBeLessThanOrEqual(157);

  expect(keyPairs.v.length).toBeOneOf([64, 62]);
  expect(keyPairs.V.length).toBeGreaterThanOrEqual(152);
  expect(keyPairs.V.length).toBeLessThanOrEqual(157);
});

test("match announcements", async () => {
  // const core = new Core();
  //
  // const desiredRecipientKeyPairs = core.generateKeyPairs();
  // const decoyRecipientKeyPairs = core.generateKeyPairs();
  //
  // const storage = new TemporaryStorage();
  // for (let i = 0; i < 100; i++) {
  //   let S: string;
  //   let V: string;
  //
  //   if (i < 50) {
  //     // First 50 we create for desired recipient
  //     S = desiredRecipientKeyPairs.S;
  //     V = desiredRecipientKeyPairs.V;
  //   } else {
  //     // Other 50 we create for "decoy" recipient
  //     S = decoyRecipientKeyPairs.S;
  //     V = decoyRecipientKeyPairs.V;
  //   }
  //
  //   const { announcement } = core.send(S, V);
  //   await storage.storeCurvyAddress(mockPopulateAnnouncement(announcement));
  // }
  //
  // const syncingResult = await announcementStorage.GetAnnouncements();
  // // expect(syncingResult.total).toBe(100);
  // const scanningResult = core.scan(desiredRecipientKeyPairs.s, desiredRecipientKeyPairs.v, syncingResult.announcements);
  //
  // expect(scanningResult).toBeTypeOf("object");
  //
  // for (let i = 0; i < scanningResult.spendingPubKeys.length; i++) {
  //   if (i < 50) {
  //     expect(scanningResult.spendingPubKeys[i]).not.toBe("");
  //     expect(scanningResult.spendingPrivKeys[i]).not.toBe("");
  //   }
  //
  //   // Because of false positives we don't try to assume that all other are "".
  // }
});

test("simplest possible test", async () => {
  const core = new Core();

  const keyPairs = await core.generateKeyPairs();

  const { babyJubjubPublicKey } = await core.getCurvyKeys(keyPairs.s, keyPairs.v);
  expect(babyJubjubPublicKey).not.toBeNull();

  const validV = core.isValidBN254Point(keyPairs.V);
  const validS = core.isValidSECP256k1Point(keyPairs.S);
  expect(validV).toBe(true);
  expect(validS).toBe(true);

  const {
    R: ephemeralPublicKey,
    viewTag,
    spendingPubKey: recipientStealthPublicKey,
  } = await core.send(keyPairs.S, keyPairs.V);

  const validR = core.isValidBN254Point(ephemeralPublicKey as string);
  expect(validR).toBe(true);

  const scanResult = await core.scan(keyPairs.s, keyPairs.v, [
    mockPopulateAnnouncement({ ephemeralPublicKey, viewTag, recipientStealthPublicKey }),
  ]);

  expect(scanResult.spendingPubKeys).lengthOf(1);
  console.log(scanResult);
});

test("Test poseidon libs", async () => {
  const poseidon = await buildPoseidon();
  const x = 123n;
  const y = 456n;
  const z = 789n;

  const h1_lite = poseidon1([x]);
  const h1_clib = poseidon.F.toObject(poseidon([x]));

  const h2_lite = poseidon2([x, y]);
  const h2_clib = poseidon.F.toObject(poseidon([x, y]));

  const h3_lite = poseidon3([x, y, z]);
  const h3_clib = poseidon.F.toObject(poseidon([x, y, z]));

  console.log("1-arg equal:", h1_lite === h1_clib);
  console.log("2-arg equal:", h2_lite === h2_clib);
  console.log("3-arg equal:", h3_lite === h3_clib);
  console.log("h1:", h1_lite.toString());
  console.log("h2:", h2_lite.toString());
  console.log("h3:", h3_lite.toString());
});
