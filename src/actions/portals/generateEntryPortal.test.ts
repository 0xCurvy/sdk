import { describe, expect, it, vi } from "vitest";
import { createFakeApi, createFakeConfig } from "@/test/fixtures";
import type { CurvyId } from "@/types/curvy";
import { generateEntryPortal } from "./generateEntryPortal";

describe("generateEntryPortal", () => {
  it("delegates to api.portal.InsertEntryPortal and returns { address, flavour }", async () => {
    const InsertEntryPortal = vi.fn(async () => ({
      address: "0x00000000000000000000000000000000000000aa" as const,
      flavour: "evm" as const,
    }));
    const config = createFakeConfig({ api: createFakeApi({ portal: { InsertEntryPortal } }) });

    const result = await generateEntryPortal({ curvyId: "alice.curvy.name" as CurvyId, config });

    expect(result).toEqual({ address: "0x00000000000000000000000000000000000000aa", flavour: "evm" });
    expect(InsertEntryPortal).toHaveBeenCalledTimes(1);
  });

  it("forwards the request body (minus config) to the api", async () => {
    const InsertEntryPortal = vi.fn(async () => ({
      address: "0x00000000000000000000000000000000000000bb" as const,
      flavour: "evm" as const,
    }));
    const config = createFakeConfig({ api: createFakeApi({ portal: { InsertEntryPortal } }) });

    await generateEntryPortal({ curvyId: "bob.curvy.name" as CurvyId, currencyId: 7, coinType: "60", config });

    expect(InsertEntryPortal).toHaveBeenCalledWith({
      curvyId: "bob.curvy.name",
      currencyId: 7,
      coinType: "60",
    });
  });
});
