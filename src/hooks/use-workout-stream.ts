"use client";

import { useState, useCallback } from "react";
import { GenerateWorkoutRequest } from "@/types/workout";
import { Profile } from "@/types/profile";
import { Equipment, EquipmentConflict } from "@/types/gym";

interface GenerateOptions {
  request: GenerateWorkoutRequest;
  apiKey?: string;
  profileData?: Profile;
  equipmentData?: Equipment[];
  conflictsData?: EquipmentConflict[];
}

interface UseWorkoutStreamReturn {
  content: string;
  isStreaming: boolean;
  error: string | null;
  generate: (options: GenerateOptions) => Promise<void>;
  reset: () => void;
}

export function useWorkoutStream(): UseWorkoutStreamReturn {
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setContent("");
    setIsStreaming(false);
    setError(null);
  }, []);

  const generate = useCallback(
    async ({ request, apiKey, profileData, equipmentData, conflictsData }: GenerateOptions) => {
      setContent("");
      setError(null);
      setIsStreaming(true);

      try {
        const res = await fetch("/api/workout/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { "X-API-Key": apiKey } : {}),
          },
          body: JSON.stringify({
            ...request,
            profile_data: profileData,
            equipment_data: equipmentData,
            conflicts_data: conflictsData,
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
          setContent(accumulated);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  return { content, isStreaming, error, generate, reset };
}
