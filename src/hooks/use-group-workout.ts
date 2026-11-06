"use client";

import { useState, useCallback } from "react";
import { GenerateGroupWorkoutRequest } from "@/types/workout";
import { Profile } from "@/types/profile";
import { Equipment, SharedResourceGroup } from "@/types/gym";
import type { GroupWorkoutOutput } from "@/lib/ai/schemas";

interface GenerateOptions {
  request: GenerateGroupWorkoutRequest;
  profileData?: Profile;
  equipmentData?: Equipment[];
  sharedResourcesData?: SharedResourceGroup[];
  layoutNotes?: string;
}

interface UseGroupWorkoutReturn {
  workout: GroupWorkoutOutput | null;
  isLoading: boolean;
  error: string | null;
  violations: string[];
  generate: (options: GenerateOptions) => Promise<void>;
  reset: () => void;
}

export function useGroupWorkout(): UseGroupWorkoutReturn {
  const [workout, setWorkout] = useState<GroupWorkoutOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [violations, setViolations] = useState<string[]>([]);

  const reset = useCallback(() => {
    setWorkout(null);
    setIsLoading(false);
    setError(null);
    setViolations([]);
  }, []);

  const generate = useCallback(
    async ({ request, profileData, equipmentData, sharedResourcesData, layoutNotes }: GenerateOptions) => {
      setWorkout(null);
      setError(null);
      setViolations([]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/workout/generate-group", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...request,
            profile_data: profileData,
            equipment_data: equipmentData,
            shared_resources_data: sharedResourcesData,
            layout_notes: layoutNotes,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (Array.isArray(data.violations)) setViolations(data.violations);
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        if (!data.workout) throw new Error("No workout returned");
        setWorkout(data.workout);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { workout, isLoading, error, violations, generate, reset };
}
