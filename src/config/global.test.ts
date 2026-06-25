import { afterEach, describe, expect, it } from "vitest";
import { NoCurvyConfigError } from "@/errors";
import { createFakeConfig } from "@/test/fixtures";
import { getCurvyConfig, peekCurvyConfig, resolveConfig, setCurvyConfig } from "./global";

// The ambient config is a module-level singleton — reset it between tests so
// state never leaks across cases.
afterEach(() => setCurvyConfig(null));

describe("global config registry", () => {
  it("throws NoCurvyConfigError when no global config is set", () => {
    setCurvyConfig(null);
    expect(() => getCurvyConfig()).toThrow(NoCurvyConfigError);
    expect(peekCurvyConfig()).toBeNull();
  });

  it("registers and returns the global config", () => {
    const config = createFakeConfig();
    setCurvyConfig(config);
    expect(getCurvyConfig()).toBe(config);
    expect(peekCurvyConfig()).toBe(config);
  });

  it("resolveConfig prefers an explicit override over the ambient global", () => {
    const ambient = createFakeConfig();
    const override = createFakeConfig();
    setCurvyConfig(ambient);
    expect(resolveConfig(override)).toBe(override);
    expect(resolveConfig(undefined)).toBe(ambient);
  });

  it("resolveConfig throws when neither an override nor a global is available", () => {
    setCurvyConfig(null);
    expect(() => resolveConfig(undefined)).toThrow(NoCurvyConfigError);
  });

  it("setCurvyConfig(null) clears the global", () => {
    setCurvyConfig(createFakeConfig());
    setCurvyConfig(null);
    expect(peekCurvyConfig()).toBeNull();
  });
});
