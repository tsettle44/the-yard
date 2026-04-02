"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfiles } from "@/hooks/use-profile";
import { useGym } from "@/hooks/use-gym";
import { usePrograms } from "@/hooks/use-programs";
import { useProgramDayStream } from "@/hooks/use-program-day-stream";
import { ProgramOutlineView } from "@/components/program/program-outline-view";
import { WorkoutView } from "@/components/workout/workout-view";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pause, Play, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { activeProfile } = useProfiles();
  const { activeGym } = useGym();
  const { programs, updateProgram } = usePrograms();
  const { workout: dayWorkout, isStreaming: isDayStreaming, error: dayError, generate: generateDay, reset: resetDay } = useProgramDayStream();
  const [generatingDay, setGeneratingDay] = useState<{ week: number; day: number } | null>(null);

  const program = programs.find((p) => p.id === id);

  if (!program) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Program not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/programs")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Programs
        </Button>
      </div>
    );
  }

  function handleGenerateDay(weekNumber: number, dayNumber: number) {
    if (!program) return;
    setGeneratingDay({ week: weekNumber, day: dayNumber });
    generateDay({
      programOutline: program.outline,
      weekNumber,
      dayNumber,
      profileData: activeProfile || undefined,
      equipmentData: program.bodyweight ? [] : (activeGym?.equipment || []),
      sharedResourcesData: program.bodyweight ? [] : (activeGym?.shared_resources || []),
      layoutNotes: program.bodyweight ? "" : (activeGym?.layout_notes || ""),
      bodyweight: program.bodyweight,
    });
  }

  function handleBackFromDay() {
    resetDay();
    setGeneratingDay(null);
  }

  function handleStatusToggle() {
    if (!program) return;
    if (program.status === "active") {
      updateProgram(program.id, { status: "paused" });
      toast.success("Program paused");
    } else {
      updateProgram(program.id, { status: "active" });
      toast.success("Program resumed");
    }
  }

  function handleComplete() {
    if (!program) return;
    updateProgram(program.id, { status: "completed" });
    toast.success("Program marked as complete!");
  }

  function handleAdvanceWeek() {
    if (!program) return;
    if (program.current_week < program.total_weeks) {
      updateProgram(program.id, {
        current_week: program.current_week + 1,
        current_day: 1,
      });
      toast.success(`Advanced to Week ${program.current_week + 1}`);
    }
  }

  if (generatingDay) {
    const dayInfo = program.outline.weeks
      .find((w) => w.week_number === generatingDay.week)
      ?.days.find((d) => d.day_number === generatingDay.day);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="ghost" size="sm" onClick={handleBackFromDay}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span>
            Week {generatingDay.week}, Day {generatingDay.day}
            {dayInfo && <span className="ml-1">— {dayInfo.name}</span>}
          </span>
        </div>
        <WorkoutView
          workout={dayWorkout}
          isStreaming={isDayStreaming}
          error={dayError}
          onBack={handleBackFromDay}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/programs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg truncate">{program.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant={program.status === "active" ? "default" : "secondary"} className="text-[10px]">
              {program.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Week {program.current_week} of {program.total_weeks}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleStatusToggle}>
          {program.status === "active" ? (
            <><Pause className="mr-1 h-3 w-3" /> Pause</>
          ) : (
            <><Play className="mr-1 h-3 w-3" /> Resume</>
          )}
        </Button>
        {program.current_week < program.total_weeks && (
          <Button variant="outline" size="sm" onClick={handleAdvanceWeek}>
            Next Week
          </Button>
        )}
        {program.status !== "completed" && (
          <Button variant="outline" size="sm" onClick={handleComplete}>
            <CheckCircle2 className="mr-1 h-3 w-3" /> Complete
          </Button>
        )}
      </div>

      <ProgramOutlineView
        outline={program.outline}
        isStreaming={false}
        error={null}
        onBack={() => router.push("/programs")}
        onGenerateDay={handleGenerateDay}
      />
    </div>
  );
}
