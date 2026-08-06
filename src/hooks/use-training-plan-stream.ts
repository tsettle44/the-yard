"use client";

import { useState, useCallback } from "react";
import { TrainingPlanRequest } from "@/types/training-plan";
import { Equipment } from "@/types/gym";
import type { TrainingPlanOutputType } from "@/lib/ai/training-plan-schemas";

interface GenerateOptions {
  request: TrainingPlanRequest;
  equipmentData?: Equipment[];
}

interface UseTrainingPlanStreamReturn {
  plan: Partial<TrainingPlanOutputType> | null;
  rawJson: string;
  isStreaming: boolean;
  error: string | null;
  generate: (options: GenerateOptions) => Promise<void>;
  reset: () => void;
}

function tryParsePartialJson(raw: string): Partial<TrainingPlanOutputType> | null {
  if (!raw.trim()) return null;

  let attempt = raw.trim();

  try {
    return JSON.parse(attempt);
  } catch {
    // Continue to repair
  }

  attempt = attempt.replace(/,\s*$/, "");

  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < attempt.length; i++) {
    const ch = attempt[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  if (inString) attempt += '"';
  attempt = attempt.replace(/,?\s*"[^"]*"\s*:\s*$/, "");
  attempt = attempt.replace(/,\s*$/, "");

  while (stack.length > 0) {
    attempt += stack.pop();
  }

  try {
    return JSON.parse(attempt);
  } catch {
    return null;
  }
}

export function useTrainingPlanStream(): UseTrainingPlanStreamReturn {
  const [plan, setPlan] = useState<Partial<TrainingPlanOutputType> | null>(null);
  const [rawJson, setRawJson] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPlan(null);
    setRawJson("");
    setIsStreaming(false);
    setError(null);
  }, []);

  const generate = useCallback(async ({ request, equipmentData }: GenerateOptions) => {
    setPlan(null);
    setRawJson("");
    setError(null);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/training-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...request,
          equipment_data: equipmentData,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";
      let lastParsed: Partial<TrainingPlanOutputType> | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setRawJson(accumulated);

        const parsed = tryParsePartialJson(accumulated);
        if (parsed) {
          lastParsed = parsed;
          setPlan(parsed);
        }
      }

      // Final parse
      setRawJson(accumulated);
      const finalParsed = tryParsePartialJson(accumulated);
      if (finalParsed) {
        setPlan(finalParsed);
      } else if (lastParsed) {
        // If final parse fails but we had a good partial result, keep it
        // and show a warning rather than losing everything
        setPlan(lastParsed);
        setError("Plan generation was interrupted. Showing partial results.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { plan, rawJson, isStreaming, error, generate, reset };
}
