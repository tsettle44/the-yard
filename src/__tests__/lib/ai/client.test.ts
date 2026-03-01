import { describe, it, expect, vi } from "vitest";

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
    expect(DEFAULT_MODEL).toBe("claude-sonnet-4-20250514");
  });
});
