"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useProfiles } from "@/hooks/use-profile";
import { useGym } from "@/hooks/use-gym";
import { useWorkoutStream } from "@/hooks/use-workout-stream";
import { useWorkouts } from "@/hooks/use-workouts";
import { useEntitlement } from "@/hooks/use-entitlement";
import { config } from "@/lib/config";
import { WorkoutForm } from "@/components/workout/workout-form";
import { WorkoutView } from "@/components/workout/workout-view";
import { UpgradeCard } from "@/components/payment/upgrade-card";
import { Workout, GenerateWorkoutRequest } from "@/types/workout";
import { toast } from "sonner";

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="animate-pulse space-y-4"><div className="h-64 bg-muted rounded-lg" /></div>}>
      <GeneratePageContent />
    </Suspense>
  );
}

function GeneratePageContent() {
  const searchParams = useSearchParams();
  const { activeProfile, guestMode, hydrated: profilesHydrated } = useProfiles();
  const { activeGym, hydrated: gymsHydrated } = useGym();
  const { workout, rawJson, isStreaming, error, generate, reset } = useWorkoutStream();
  const { addWorkout } = useWorkouts();
  const entitlement = useEntitlement();
  const lastRequestRef = useRef<GenerateWorkoutRequest | null>(null);
  const paymentHandledRef = useRef(false);
  const [view, setView] = useState<"form" | "workout">("form");

  const hydrated = profilesHydrated && gymsHydrated;

  // Handle ?payment=success query param
  useEffect(() => {
    if (paymentHandledRef.current) return;
    const payment = searchParams.get("payment");
    if (payment === "success") {
      paymentHandledRef.current = true;
      toast.success("Payment successful! You now have full access.");
      entitlement.refresh();
      window.history.replaceState({}, "", "/generate");
    }
  }, [searchParams, entitlement]);

  if (!hydrated) {
    return <div className="animate-pulse space-y-4"><div className="h-64 bg-muted rounded-lg" /></div>;
  }

  function handleGenerate(request: GenerateWorkoutRequest) {
    lastRequestRef.current = request;
    generate({
      request,
      profileData: activeProfile || undefined,
      equipmentData: activeGym?.equipment || [],
      sharedResourcesData: activeGym?.shared_resources || [],
      layoutNotes: activeGym?.layout_notes || "",
    });
    setView("workout");
  }

  function handleBack() {
    reset();
    entitlement.refresh();
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

    addWorkout(workoutRecord);
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

  const isHosted = config.isHosted;
  const showLimitReached = isHosted && !entitlement.loading && !entitlement.canGenerate;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {isHosted && !entitlement.loading && entitlement.plan && (
        <div className="text-sm text-muted-foreground text-center">
          {entitlement.remaining} generation{entitlement.remaining !== 1 ? "s" : ""} remaining
          {entitlement.plan === "free" ? "" : " today"}
        </div>
      )}

      {showLimitReached ? (
        entitlement.plan === "free" ? (
          <UpgradeCard />
        ) : (
          <div className="text-center text-sm text-muted-foreground py-8">
            Daily limit reached. Come back tomorrow!
          </div>
        )
      ) : (
        <WorkoutForm
          profileId={activeProfile?.id || null}
          gymId={activeGym?.id || null}
          guestMode={guestMode}
          onGenerate={handleGenerate}
          isStreaming={isStreaming}
        />
      )}
    </div>
  );
}
