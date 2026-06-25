import { createAnthropic } from "@ai-sdk/anthropic";

export function getAIClient(apiKey?: string) {
  return createAnthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
  });
}

export const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
