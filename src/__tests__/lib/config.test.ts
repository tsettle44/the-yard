import { describe, it, expect, vi, beforeEach } from "vitest";

describe("config", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("defaults to self-hosted mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_MODE", "");
    vi.stubEnv("DEPLOYMENT_MODE", "");
    const { config } = await import("@/lib/config");
    expect(config.deploymentMode).toBe("self-hosted");
  });

  it("reads NEXT_PUBLIC_DEPLOYMENT_MODE env var", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_MODE", "hosted");
    const { config } = await import("@/lib/config");
    expect(config.deploymentMode).toBe("hosted");
  });

  it("isSelfHosted is true in self-hosted mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_MODE", "self-hosted");
    const { config } = await import("@/lib/config");
    expect(config.isSelfHosted).toBe(true);
    expect(config.isHosted).toBe(false);
  });

  it("isHosted is true in hosted mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_MODE", "hosted");
    const { config } = await import("@/lib/config");
    expect(config.isHosted).toBe(true);
    expect(config.isSelfHosted).toBe(false);
  });

  it("reads feature flags", async () => {
    vi.stubEnv("FEATURE_PAYMENT", "true");
    vi.stubEnv("FEATURE_PWA", "false");
    const { config } = await import("@/lib/config");
    expect(config.features.payment).toBe(true);
    expect(config.features.pwa).toBe(false);
  });

  it("has correct limit constants", async () => {
    const { config } = await import("@/lib/config");
    expect(config.freeGenerations).toBe(3);
    expect(config.dailyGenerationLimit).toBe(3);
  });
});
