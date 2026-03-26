"use client";

import { useState } from "react";
import { useTrainingPlanStream } from "@/hooks/use-training-plan-stream";
import { TrainingPlanForm } from "@/components/training-plan/training-plan-form";
import { TrainingPlanCalendar } from "@/components/training-plan/training-plan-calendar";
import { downloadIcal } from "@/lib/ical-export";
import { TrainingPlanRequest } from "@/types/training-plan";
import type { TrainingPlanOutputType } from "@/lib/ai/training-plan-schemas";
import { toast } from "sonner";

export default function TrainingPlansPage() {
  const { plan, isStreaming, error, generate, reset } = useTrainingPlanStream();
  const [view, setView] = useState<"form" | "plan">("form");

  function handleGenerate(request: TrainingPlanRequest) {
    generate(request);
    setView("plan");
  }

  function handleBack() {
    reset();
    setView("form");
  }

  function handleExport() {
    if (!plan?.weeks?.length || !plan?.plan_name) return;
    try {
      downloadIcal(plan as TrainingPlanOutputType);
      toast.success("Training plan exported as .ics file");
    } catch {
      toast.error("Failed to export training plan");
    }
  }

  if (view === "plan") {
    return (
      <div className="max-w-2xl mx-auto">
        <TrainingPlanCalendar
          plan={plan}
          isStreaming={isStreaming}
          error={error}
          onBack={handleBack}
          onExport={handleExport}
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <TrainingPlanForm onGenerate={handleGenerate} isStreaming={isStreaming} />
    </div>
  );
}
