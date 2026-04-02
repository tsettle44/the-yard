"use client";

import { useState, useCallback } from "react";
import { Profile } from "@/types/profile";
import { Equipment, SharedResourceGroup } from "@/types/gym";
import { ProgramOutline } from "@/types/program";
import type { WorkoutOutput } from "@/lib/ai/schemas";

interface GenerateDayOptions {
  programOutline: ProgramOutline;
  weekNumber: number;
  dayNumber: number;
  profileData?: Profile;
  equipmentData?: Equipment[];
  sharedResourcesData?: SharedResourceGroup[];
  layoutNotes?: string;
  bodyweight?: boolean;
}

interface UseProgramDayStreamReturn {
  workout: Partial<WorkoutOutput> | null;
  rawJson: string;
  isStreaming: boolean;
  error: string | null;
  generate: (options: GenerateDayOptions) => Promise<void>;
  reset: () => void;
}

function tryParsePartialJson(raw: string): Partial<WorkoutOutput> | null {
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

export function useProgramDayStream(): UseProgramDayStreamReturn {
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
    async ({ programOutline, weekNumber, dayNumber, profileData, equipmentData, sharedResourcesData, layoutNotes, bodyweight }: GenerateDayOptions) => {
      setWorkout(null);
      setRawJson("");
      setError(null);
      setIsStreaming(true);

      try {
        const res = await fetch("/api/program/generate-day", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            program_outline: programOutline,
            week_number: weekNumber,
            day_number: dayNumber,
            profile_data: profileData,
            equipment_data: equipmentData,
            shared_resources_data: sharedResourcesData,
            layout_notes: layoutNotes,
            bodyweight,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
