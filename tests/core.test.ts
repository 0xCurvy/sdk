import { Core } from "@/core";
import { expect, test } from "vitest";
import { mockPopulateAnnouncement } from "./utils/announcement-filler";

test("should generate new Curvy keypairs", async () => {
  const core = await Core.init();

  const keyPairs = core.generateKeyPairs();

  expect(keyPairs.s.length).toBe(64);
  expect(keyPairs.S.length).toBeGreaterThanOrEqual(152);
  expect(keyPairs.S.length).toBeLessThanOrEqual(157);

  expect(keyPairs.v.length).toBeOneOf([64, 62]);
  expect(keyPairs.V.length).toBeGreaterThanOrEqual(152);
  expect(keyPairs.V.length).toBeLessThanOrEqual(157);
});

test("match announcements", async () => {
  // const core = await Core.init();
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
  const core = await Core.init();

  const keyPairs = core.generateKeyPairs();

  const validV = core.isValidBN254Point(keyPairs.V);
  const validS = core.isValidSECP256k1Point(keyPairs.S);
  expect(validV).toBe(true);
  expect(validS).toBe(true);

  const {
    R: ephemeralPublicKey,
    viewTag,
    spendingPubKey: recipientStealthPublicKey,
  } = core.send(keyPairs.S, keyPairs.V);

  const validR = core.isValidBN254Point(ephemeralPublicKey as string);
  expect(validR).toBe(true);

  const scanResult = core.scan(keyPairs.s, keyPairs.v, [
    mockPopulateAnnouncement({ ephemeralPublicKey, viewTag, recipientStealthPublicKey }),
  ]);

  expect(scanResult.spendingPubKeys).lengthOf(1);
  console.log(scanResult);
});
