import { describe, expect, it, vi } from "vitest";
import { createFakeApi, createFakeConfig } from "@/test/fixtures";
import type { CurvyId } from "@/types/curvy";
import { generateExitPortal } from "./generateExitPortal";

describe("generateExitPortal", () => {
  it("delegates to api.portal.insertExitPortal and returns { address, flavour }", async () => {
    const insertExitPortal = vi.fn(async () => ({
      address: "0x00000000000000000000000000000000000000cc" as const,
      flavour: "evm" as const,
    }));
    const config = createFakeConfig({ api: createFakeApi({ portal: { insertExitPortal } }) });

    const result = await generateExitPortal({
      curvyId: "alice.curvy.name" as CurvyId,
      currencyId: 1,
      exitAddress: "0x00000000000000000000000000000000000000ff",
      config,
    });

    expect(result).toEqual({ address: "0x00000000000000000000000000000000000000cc", flavour: "evm" });
    expect(insertExitPortal).toHaveBeenCalledTimes(1);
  });

  it("forwards the request body (minus config) to the api", async () => {
    const insertExitPortal = vi.fn(async () => ({
      address: "0x00000000000000000000000000000000000000dd" as const,
      flavour: "evm" as const,
    }));
    const config = createFakeConfig({ api: createFakeApi({ portal: { insertExitPortal } }) });

    await generateExitPortal({
      curvyId: "bob.curvy.name" as CurvyId,
      currencyId: 2,
      exitAddress: "0x0000000000000000000000000000000000000001",
      config,
    });

    expect(insertExitPortal).toHaveBeenCalledWith({
      curvyId: "bob.curvy.name",
      currencyId: 2,
      exitAddress: "0x0000000000000000000000000000000000000001",
    });
  });
});
