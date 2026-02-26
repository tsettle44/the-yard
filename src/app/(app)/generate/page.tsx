"use client";

import { useRef, useState } from "react";
import { useProfiles } from "@/hooks/use-profile";
import { useGym } from "@/hooks/use-gym";
import { useWorkoutStream } from "@/hooks/use-workout-stream";
import { WorkoutForm } from "@/components/workout/workout-form";
import { WorkoutView } from "@/components/workout/workout-view";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Workout, GenerateWorkoutRequest } from "@/types/workout";
import { toast } from "sonner";

export default function GeneratePage() {
  const { activeProfile, guestMode, hydrated: profilesHydrated } = useProfiles();
  const { activeGym, hydrated: gymsHydrated } = useGym();
  const { workout, rawJson, isStreaming, error, generate, reset } = useWorkoutStream();
  const [, setWorkoutHistory] = useLocalStorage<Workout[]>(
    "the-yard-workout-history",
    []
  );
  const lastRequestRef = useRef<GenerateWorkoutRequest | null>(null);
  const [view, setView] = useState<"form" | "workout">("form");

  const hydrated = profilesHydrated && gymsHydrated;

  if (!hydrated) {
    return <div className="animate-pulse space-y-4"><div className="h-64 bg-muted rounded-lg" /></div>;
  }

  function handleGenerate(request: GenerateWorkoutRequest) {
    lastRequestRef.current = request;
    generate({
      request,
      profileData: activeProfile || undefined,
      equipmentData: activeGym?.equipment || [],
      conflictsData: activeGym?.conflicts || [],
    });
    setView("workout");
  }

  function handleBack() {
    reset();
    setView("form");
  }

  function handleSave() {
    if (!workout || !activeGym) return;
    if (!guestMode && !activeProfile) return;
    const req = lastRequestRef.current;

    const workoutRecord: Workout = {
      id: crypto.randomUUID(),
      profile_id: guestMode ? null : activeProfile?.id || null,
      gym_id: activeGym.id,
      style: req?.style || "strength",
      duration_min: req?.duration_min || 45,
      target_rpe: req?.target_rpe || 7,
      body_groups: req?.body_groups || ["full_body"],
      parameters: req?.parameters || {},
      content: rawJson,
      structured: workout as Workout["structured"],
      model_used: "claude-sonnet",
      prompt_tokens: 0,
      completion_tokens: 0,
      rating: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setWorkoutHistory((prev) => [workoutRecord, ...prev]);
    toast.success("Workout saved to history");
  }

  if (view === "workout") {
    return (
      <WorkoutView
        workout={workout}
        isStreaming={isStreaming}
        error={error}
        onSave={workout && !isStreaming ? handleSave : undefined}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <WorkoutForm
        profileId={activeProfile?.id || null}
        gymId={activeGym?.id || null}
        guestMode={guestMode}
        onGenerate={handleGenerate}
        isStreaming={isStreaming}
      />
    </div>
  );
}
