"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useProfiles } from "@/hooks/use-profile";
import { useGym } from "@/hooks/use-gym";
import { useGroupWorkout } from "@/hooks/use-group-workout";
import { useWorkouts } from "@/hooks/use-workouts";
import { useEntitlement } from "@/hooks/use-entitlement";
import { config } from "@/lib/config";
import { DEFAULT_MODEL } from "@/lib/ai/client";
import type { SavedGroupWorkout } from "@/lib/ai/schemas";
import { WorkoutForm } from "@/components/workout/workout-form";
import { GroupSizeFields } from "@/components/workout/group-size-fields";
import { GroupWorkoutView } from "@/components/workout/group-workout-view";
import { UpgradeCard } from "@/components/payment/upgrade-card";
import { Workout, GenerateWorkoutRequest, GenerateGroupWorkoutRequest } from "@/types/workout";
import { toast } from "sonner";

export default function GroupGeneratePage() {
  const { activeProfile, guestMode, hydrated: profilesHydrated } = useProfiles();
  const { activeGym, hydrated: gymsHydrated } = useGym();
  const { workout, isLoading, error, violations, generate, reset } = useGroupWorkout();
  const { addWorkout } = useWorkouts();
  const entitlement = useEntitlement();
  const [lastRequest, setLastRequest] = useState<GenerateGroupWorkoutRequest | null>(null);
  const [equipmentNames, setEquipmentNames] = useState<Record<string, string>>({});
  const [view, setView] = useState<"form" | "workout">("form");
  const [groupSize, setGroupSize] = useState(2);
  const [names, setNames] = useState<string[]>([]);

  const hydrated = profilesHydrated && gymsHydrated;

  const resultSize = lastRequest?.group_size ?? groupSize;

  const saved = useMemo<SavedGroupWorkout | null>(() => {
    if (!workout) return null;
    return {
      ...workout,
      person_names: Array.from({ length: resultSize }, (_, i) => lastRequest?.person_names?.[i] || ""),
      equipment_names: equipmentNames,
    };
  }, [workout, lastRequest, resultSize, equipmentNames]);

  if (!hydrated) {
    return <div className="animate-pulse space-y-4"><div className="h-64 bg-muted rounded-lg" /></div>;
  }

  function handleGenerate(base: GenerateWorkoutRequest) {
    const request: GenerateGroupWorkoutRequest = {
      ...base,
      group_size: groupSize,
      person_names: names.slice(0, groupSize).map((n) => n.trim()),
    };
    const equipment = request.bodyweight ? [] : (activeGym?.equipment || []);
    setLastRequest(request);
    setEquipmentNames(Object.fromEntries(equipment.map((e) => [e.id, e.name])));
    generate({
      request,
      profileData: activeProfile || undefined,
      equipmentData: equipment,
      sharedResourcesData: request.bodyweight ? [] : (activeGym?.shared_resources || []),
      layoutNotes: request.bodyweight ? "" : (activeGym?.layout_notes || ""),
    });
    setView("workout");
  }

  function handleBack() {
    reset();
    entitlement.refresh();
    setView("form");
  }

  function handleSave() {
    if (!saved) return;
    const req = lastRequest;
    if (!req?.bodyweight && !activeGym) return;
    if (!guestMode && !activeProfile) return;

    const workoutRecord: Workout = {
      id: crypto.randomUUID(),
      profile_id: guestMode ? null : activeProfile?.id || null,
      gym_id: req?.bodyweight ? "bodyweight" : (activeGym?.id || ""),
      style: req?.style || "strength",
      duration_min: req?.duration_min || 45,
      target_rpe: req?.target_rpe || 7,
      body_groups: req?.body_groups || ["full_body"],
      parameters: { ...(req?.parameters || {}), group_size: req?.group_size ?? groupSize },
      content: JSON.stringify(saved),
      structured: saved as unknown as Workout["structured"],
      model_used: DEFAULT_MODEL,
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
      <GroupWorkoutView
        workout={saved}
        groupSize={resultSize}
        isLoading={isLoading}
        error={error}
        violations={violations}
        onSave={saved && !isLoading ? handleSave : undefined}
        onBack={handleBack}
      />
    );
  }

  const isHosted = config.isHosted;
  const showLimitReached = isHosted && !entitlement.loading && !entitlement.canGenerate;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Link
        href="/generate"
        className="inline-block text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-medium"
      >
        ← Solo workout
      </Link>

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
          isStreaming={isLoading}
          title="Group Workout"
          submitLabel="Generate Group Workout"
        >
          <GroupSizeFields
            groupSize={groupSize}
            onGroupSizeChange={setGroupSize}
            names={names}
            onNamesChange={setNames}
          />
        </WorkoutForm>
      )}
    </div>
  );
}
