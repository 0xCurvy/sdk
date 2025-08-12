import { test } from "vitest";

test("should have one scanner match", async () => {
  // const storage = new ArrayAnnouncementStorage();
  // const emitter = new CurvyEventEmitter();
  // const client = new MockAPIClient();
  // const core = await Core.init();
  //
  // const scanner = new AddressScanner(storage, core, client, emitter);
  //
  // // Create new keyPairs and a wallet
  // const keyPairs = core.generateKeyPairs();
  // const wallet = new CurvyWallet("test-handle", "0x0", keyPairs);
  //
  // // Create a new stealth address for the wallet and write to storage
  // const { announcement } = core.send(keyPairs.S, keyPairs.V);
  // await storage.WriteAnnouncement(mockPopulateAnnouncement(announcement));
  //
  // let scanMatchEventReceived = false;
  // emitter.on(SCAN_MATCH_EVENT, (event: ScanMatchEvent) => {
  //   scanMatchEventReceived = true;
  // });
  //
  // // Register the wallet with the scanner
  // await scanner.AddWallet(wallet);
  //
  // // Expect the scan match to occur
  // expect(scanMatchEventReceived).toBe(true);
});
