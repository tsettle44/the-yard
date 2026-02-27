"use client";

import { useState, useCallback } from "react";
import { GenerateWorkoutRequest } from "@/types/workout";
import { Profile } from "@/types/profile";
import { Equipment, SharedResourceGroup } from "@/types/gym";
import type { WorkoutOutput } from "@/lib/ai/schemas";

interface GenerateOptions {
  request: GenerateWorkoutRequest;
  profileData?: Profile;
  equipmentData?: Equipment[];
  sharedResourcesData?: SharedResourceGroup[];
  layoutNotes?: string;
}

interface UseWorkoutStreamReturn {
  workout: Partial<WorkoutOutput> | null;
  rawJson: string;
  isStreaming: boolean;
  error: string | null;
  generate: (options: GenerateOptions) => Promise<void>;
  reset: () => void;
}

/**
 * Attempt to repair a partial JSON string by closing open brackets/braces/quotes.
 * Returns parsed object or null if repair fails.
 */
function tryParsePartialJson(raw: string): Partial<WorkoutOutput> | null {
  if (!raw.trim()) return null;

  let attempt = raw.trim();

  // Try parsing as-is first
  try {
    return JSON.parse(attempt);
  } catch {
    // Continue to repair
  }

  // Remove trailing comma before we close things
  attempt = attempt.replace(/,\s*$/, "");

  // Track what needs closing
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

  // Close open string
  if (inString) attempt += '"';

  // Remove trailing incomplete key-value (e.g. `"key": ` with no value)
  attempt = attempt.replace(/,?\s*"[^"]*"\s*:\s*$/, "");

  // Remove trailing comma again after cleanup
  attempt = attempt.replace(/,\s*$/, "");

  // Close open brackets/braces
  while (stack.length > 0) {
    attempt += stack.pop();
  }

  try {
    return JSON.parse(attempt);
  } catch {
    return null;
  }
}

export function useWorkoutStream(): UseWorkoutStreamReturn {
  const [workout, setWorkout] = useState<Partial<WorkoutOutput> | null>(null);
  const [rawJson, setRawJson] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setWorkout(null);
    setRawJson("");
    setIsStreaming(false);
    setError(null);
  }, []);

  const generate = useCallback(
    async ({ request, profileData, equipmentData, sharedResourcesData, layoutNotes }: GenerateOptions) => {
      setWorkout(null);
      setRawJson("");
      setError(null);
      setIsStreaming(true);

      try {
        const res = await fetch("/api/workout/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...request,
            profile_data: profileData,
            equipment_data: equipmentData,
            shared_resources_data: sharedResourcesData,
            layout_notes: layoutNotes,
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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setRawJson(accumulated);

          const parsed = tryParsePartialJson(accumulated);
          if (parsed) {
            setWorkout(parsed);
          }
        }

        // Final parse
        setRawJson(accumulated);
        const finalParsed = tryParsePartialJson(accumulated);
        if (finalParsed) {
          setWorkout(finalParsed);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  return { workout, rawJson, isStreaming, error, generate, reset };
}
