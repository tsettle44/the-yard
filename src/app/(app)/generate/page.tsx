"use client";

import { useRef } from "react";
import { useProfiles } from "@/hooks/use-profile";
import { useGym } from "@/hooks/use-gym";
import { useWorkoutStream } from "@/hooks/use-workout-stream";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { WorkoutForm } from "@/components/workout/workout-form";
import { WorkoutStream } from "@/components/workout/workout-stream";
import { Workout, GenerateWorkoutRequest } from "@/types/workout";
import { toast } from "sonner";

export default function GeneratePage() {
  const { activeProfile, hydrated: profilesHydrated } = useProfiles();
  const { activeGym, hydrated: gymsHydrated } = useGym();
  const { content, isStreaming, error, generate } = useWorkoutStream();
  const [apiKey] = useLocalStorage<string>("the-yard-api-key", "");
  const [, setWorkoutHistory] = useLocalStorage<Workout[]>(
    "the-yard-workout-history",
    []
  );
  const lastRequestRef = useRef<GenerateWorkoutRequest | null>(null);

  const hydrated = profilesHydrated && gymsHydrated;

  if (!hydrated) {
    return <div className="animate-pulse space-y-4"><div className="h-64 bg-muted rounded-lg" /></div>;
  }

  function handleGenerate(request: GenerateWorkoutRequest) {
    lastRequestRef.current = request;
    generate({
      request,
      apiKey: apiKey || undefined,
      profileData: activeProfile || undefined,
      equipmentData: activeGym?.equipment || [],
      conflictsData: activeGym?.conflicts || [],
    });
  }

  function handleSave() {
    if (!content || !activeProfile || !activeGym) return;
    const req = lastRequestRef.current;

    const workout: Workout = {
      id: crypto.randomUUID(),
      profile_id: activeProfile.id,
      gym_id: activeGym.id,
      style: req?.style || "strength",
      duration_min: req?.duration_min || 45,
      target_rpe: req?.target_rpe || 7,
      body_groups: req?.body_groups || ["full_body"],
      parameters: req?.parameters || {},
      content,
      structured: null,
      model_used: "claude-sonnet",
      prompt_tokens: 0,
      completion_tokens: 0,
      rating: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setWorkoutHistory((prev) => [workout, ...prev]);
    toast.success("Workout saved to history");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
      <div>
        <WorkoutForm
          profileId={activeProfile?.id || null}
          gymId={activeGym?.id || null}
          onGenerate={handleGenerate}
          isStreaming={isStreaming}
        />
      </div>
      <div>
        <WorkoutStream
          content={content}
          isStreaming={isStreaming}
          error={error}
          onSave={content && !isStreaming ? handleSave : undefined}
        />
      </div>
    </div>
  );
}
