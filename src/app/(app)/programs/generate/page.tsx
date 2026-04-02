"use client";

import { Suspense, useRef, useState } from "react";
import { useProfiles } from "@/hooks/use-profile";
import { useGym } from "@/hooks/use-gym";
import { useProgramStream } from "@/hooks/use-program-stream";
import { usePrograms } from "@/hooks/use-programs";
import { ProgramForm } from "@/components/program/program-form";
import { ProgramOutlineView } from "@/components/program/program-outline-view";
import { GenerateProgramRequest, Program } from "@/types/program";
import { toast } from "sonner";

export default function GenerateProgramPage() {
  return (
    <Suspense fallback={<div className="animate-pulse space-y-4"><div className="h-64 bg-muted rounded-lg" /></div>}>
      <GenerateProgramContent />
    </Suspense>
  );
}

function GenerateProgramContent() {
  const { activeProfile, guestMode, hydrated: profilesHydrated } = useProfiles();
  const { activeGym, hydrated: gymsHydrated } = useGym();
  const { outline, isStreaming, error, generate, reset } = useProgramStream();
  const { addProgram } = usePrograms();
  const lastRequestRef = useRef<GenerateProgramRequest | null>(null);
  const [view, setView] = useState<"form" | "outline">("form");

  const hydrated = profilesHydrated && gymsHydrated;

  if (!hydrated) {
    return <div className="animate-pulse space-y-4"><div className="h-64 bg-muted rounded-lg" /></div>;
  }

  function handleGenerate(request: GenerateProgramRequest) {
    lastRequestRef.current = request;
    generate({
      request,
      profileData: activeProfile || undefined,
      equipmentData: activeGym?.equipment || [],
      sharedResourcesData: activeGym?.shared_resources || [],
      layoutNotes: activeGym?.layout_notes || "",
    });
    setView("outline");
  }

  function handleBack() {
    reset();
    setView("form");
  }

  function handleSave() {
    if (!outline || !outline.weeks || !activeGym) return;
    if (!guestMode && !activeProfile) return;
    const req = lastRequestRef.current;

    const programRecord: Program = {
      id: crypto.randomUUID(),
      profile_id: guestMode ? null : activeProfile?.id || null,
      gym_id: activeGym.id,
      template: req?.template || "custom",
      name: outline.name || "Untitled Program",
      total_weeks: req?.total_weeks || 4,
      days_per_week: req?.days_per_week || 3,
      outline: outline as Program["outline"],
      current_week: 1,
      current_day: 1,
      status: "active",
      parameters: req?.parameters || {},
      model_used: "claude-sonnet",
      bodyweight: req?.bodyweight || false,
      rating: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addProgram(programRecord);
    toast.success("Program saved!");
  }

  if (view === "outline") {
    return (
      <ProgramOutlineView
        outline={outline}
        isStreaming={isStreaming}
        error={error}
        onSave={outline && !isStreaming && outline.weeks ? handleSave : undefined}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <ProgramForm
        profileId={activeProfile?.id || null}
        gymId={activeGym?.id || null}
        guestMode={guestMode}
        onGenerate={handleGenerate}
        isStreaming={isStreaming}
      />
    </div>
  );
}
