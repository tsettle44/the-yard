import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn((opts: { apiKey: string }) => opts),
}));

describe("AI client", () => {
  it("creates client with provided key", async () => {
    const { getAIClient } = await import("@/lib/ai/client");
    const result = getAIClient("sk-test-key") as unknown as { apiKey: string };
    expect(result.apiKey).toBe("sk-test-key");
  });

  it("falls back to env var when no key provided", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-env-key");
    vi.resetModules();
    const { getAIClient } = await import("@/lib/ai/client");
    const result = getAIClient() as unknown as { apiKey: string };
    expect(result.apiKey).toBe("sk-env-key");
  });

  it("exports DEFAULT_MODEL constant", async () => {
    const { DEFAULT_MODEL } = await import("@/lib/ai/client");
    expect(DEFAULT_MODEL).toBe("claude-haiku-4-5-20251001");
  });

  describe("getModelId", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns the default when AI_MODEL is unset", async () => {
      vi.stubEnv("AI_MODEL", undefined);
      const { getModelId, DEFAULT_MODEL } = await import("@/lib/ai/client");
      expect(getModelId()).toBe(DEFAULT_MODEL);
    });

    it("returns AI_MODEL when set, trimmed", async () => {
      vi.stubEnv("AI_MODEL", "  claude-sonnet-4-5  ");
      const { getModelId } = await import("@/lib/ai/client");
      expect(getModelId()).toBe("claude-sonnet-4-5");
    });

    it.each(["", "   "])("falls back to the default for blank value %j", async (value) => {
      vi.stubEnv("AI_MODEL", value);
      const { getModelId, DEFAULT_MODEL } = await import("@/lib/ai/client");
      expect(getModelId()).toBe(DEFAULT_MODEL);
    });

    it("reads the env at call time", async () => {
      const { getModelId, DEFAULT_MODEL } = await import("@/lib/ai/client");
      vi.stubEnv("AI_MODEL", "custom-model");
      expect(getModelId()).toBe("custom-model");
      vi.stubEnv("AI_MODEL", "");
      expect(getModelId()).toBe(DEFAULT_MODEL);
    });
  });
});
