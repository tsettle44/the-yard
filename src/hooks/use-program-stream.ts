"use client";

import { useState, useCallback } from "react";
import { GenerateProgramRequest } from "@/types/program";
import { Profile } from "@/types/profile";
import { Equipment, SharedResourceGroup } from "@/types/gym";
import type { ProgramOutlineOutput } from "@/lib/ai/schemas-program";

interface GenerateOptions {
  request: GenerateProgramRequest;
  profileData?: Profile;
  equipmentData?: Equipment[];
  sharedResourcesData?: SharedResourceGroup[];
  layoutNotes?: string;
}

interface UseProgramStreamReturn {
  outline: Partial<ProgramOutlineOutput> | null;
  rawJson: string;
  isStreaming: boolean;
  error: string | null;
  generate: (options: GenerateOptions) => Promise<void>;
  reset: () => void;
}

function tryParsePartialJson(raw: string): Partial<ProgramOutlineOutput> | null {
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

export function useProgramStream(): UseProgramStreamReturn {
  const [outline, setOutline] = useState<Partial<ProgramOutlineOutput> | null>(null);
  const [rawJson, setRawJson] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setOutline(null);
    setRawJson("");
    setIsStreaming(false);
    setError(null);
  }, []);

  const generate = useCallback(
    async ({ request, profileData, equipmentData, sharedResourcesData, layoutNotes }: GenerateOptions) => {
      setOutline(null);
      setRawJson("");
      setError(null);
      setIsStreaming(true);

      try {
        const res = await fetch("/api/program/generate", {
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
            setOutline(parsed);
          }
        }

        setRawJson(accumulated);
        const finalParsed = tryParsePartialJson(accumulated);
        if (finalParsed) {
          setOutline(finalParsed);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  return { outline, rawJson, isStreaming, error, generate, reset };
}
