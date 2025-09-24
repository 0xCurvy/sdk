import { expect, test } from "vitest";
import { Core } from "@/core";

test("should create new multinote object", async () => {
  const core = await Core.init();

  const keyPairs = core.generateKeyPairs();

  expect(keyPairs.s.length).toBe(64);
  expect(keyPairs.S.length).toBeGreaterThanOrEqual(152);
  expect(keyPairs.S.length).toBeLessThanOrEqual(157);

  expect(keyPairs.v.length).toBeOneOf([64, 62]);
  expect(keyPairs.V.length).toBeGreaterThanOrEqual(152);
  expect(keyPairs.V.length).toBeLessThanOrEqual(157);
});