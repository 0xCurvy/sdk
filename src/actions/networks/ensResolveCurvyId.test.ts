import { describe, expect, it, vi } from "vitest";
import type { MultiRpc } from "@/rpc/multi";
import { createFakeConfig, createFakeMultiRpc, fixtureNetworks } from "@/test/fixtures";
import type { CurvyId } from "@/types/curvy";

import { ensResolveCurvyId } from "./ensResolveCurvyId";

const handle = "alice.curvy.name" as CurvyId;

describe("ensResolveCurvyId", () => {
  it("resolves a handle to an address via the rpc", async () => {
    const resolver = vi.fn(async () => "0x000000000000000000000000000000000000beef");
    const config = createFakeConfig({
      networks: fixtureNetworks,
      rpc: { ...createFakeMultiRpc(), ensResolveCurvyId: resolver } as unknown as MultiRpc,
    });

    const address = await ensResolveCurvyId({ handle, config });

    expect(address).toBe("0x000000000000000000000000000000000000beef");
    expect(resolver).toHaveBeenCalledWith(handle, config.state.environment, undefined);
  });

  it("forwards the slip0044 coin type to the rpc", async () => {
    const resolver = vi.fn(async () => "0x000000000000000000000000000000000000cafe");
    const config = createFakeConfig({
      networks: fixtureNetworks,
      rpc: { ...createFakeMultiRpc(), ensResolveCurvyId: resolver } as unknown as MultiRpc,
    });

    await ensResolveCurvyId({ handle, slip0044: 60n, config });

    expect(resolver).toHaveBeenCalledWith(handle, config.state.environment, 60n);
  });

  it("throws when the handle cannot be resolved", async () => {
    const resolver = vi.fn(async () => null);
    const config = createFakeConfig({
      networks: fixtureNetworks,
      rpc: { ...createFakeMultiRpc(), ensResolveCurvyId: resolver } as unknown as MultiRpc,
    });

    await expect(ensResolveCurvyId({ handle, config })).rejects.toThrowError(/not found via ENS/);
  });
});
