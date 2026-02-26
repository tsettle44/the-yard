"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Save, Loader2, Flame, Dumbbell, Wind, Lightbulb, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { WorkoutOutput, WorkoutBlock, WorkoutExercise, WorkoutListItem } from "@/lib/ai/schemas";

interface WorkoutViewProps {
  workout: Partial<WorkoutOutput> | null;
  isStreaming: boolean;
  error: string | null;
  onSave?: () => void;
  onBack: () => void;
}

const formatLabels: Record<string, string> = {
  straight: "Straight Sets",
  superset: "Superset",
  circuit: "Circuit",
  emom: "EMOM",
  amrap: "AMRAP",
  tabata: "Tabata",
};

function ExerciseCard({ exercise }: { exercise: Partial<WorkoutExercise> }) {
  return (
    <div className="rounded-lg border bg-card p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-sm sm:text-base">{exercise.name || "..."}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Sets</p>
          <p className="text-xl sm:text-2xl font-bold font-mono">{exercise.sets || "..."}</p>
        </div>
        <div>
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Reps</p>
          <p className="text-xl sm:text-2xl font-bold font-mono">{exercise.reps || "..."}</p>
        </div>
        <div>
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Rest</p>
          <p className="text-xl sm:text-2xl font-bold font-mono">{exercise.rest || "..."}</p>
        </div>
      </div>
      {exercise.note && (
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 italic">{exercise.note}</p>
      )}
    </div>
  );
}

function WarmupSection({ items }: { items: Partial<WorkoutListItem>[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-l-4 border-l-orange-500 bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b bg-orange-500/5">
        <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 shrink-0" />
        <h2 className="font-bold text-base sm:text-lg tracking-wide uppercase">Warm-Up</h2>
        <Badge variant="outline" className="ml-auto text-[10px] sm:text-xs uppercase tracking-wider">warmup</Badge>
      </div>
      <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-baseline gap-3">
            <span className="text-muted-foreground font-mono text-sm w-5 shrink-0 text-right">{i + 1}.</span>
            <span className="font-medium text-sm sm:text-base">{item.name || "..."}</span>
            <span className="text-muted-foreground text-sm ml-auto shrink-0">{item.detail || "..."}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CooldownSection({ items }: { items: Partial<WorkoutListItem>[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-l-4 border-l-sky-500 bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b bg-sky-500/5">
        <Wind className="h-5 w-5 sm:h-6 sm:w-6 text-sky-500 shrink-0" />
        <h2 className="font-bold text-base sm:text-lg tracking-wide uppercase">Cool-Down</h2>
        <Badge variant="outline" className="ml-auto text-[10px] sm:text-xs uppercase tracking-wider">cooldown</Badge>
      </div>
      <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-baseline gap-3">
            <span className="text-muted-foreground font-mono text-sm w-5 shrink-0 text-right">{i + 1}.</span>
            <span className="font-medium text-sm sm:text-base">{item.name || "..."}</span>
            <span className="text-muted-foreground text-sm ml-auto shrink-0">{item.detail || "..."}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockSection({ block }: { block: Partial<WorkoutBlock> }) {
  return (
    <div className="rounded-xl border border-l-4 border-l-primary bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b bg-primary/5">
        <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
        <h2 className="font-bold text-base sm:text-lg tracking-wide uppercase">{block.name || "..."}</h2>
        {block.format && (
          <Badge variant="default" className="ml-auto text-[10px] sm:text-xs uppercase tracking-wider">
            {formatLabels[block.format] || block.format}
          </Badge>
        )}
      </div>
      <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-3">
        {block.exercises?.map((exercise, i) => (
          <ExerciseCard key={i} exercise={exercise} />
        ))}
        {block.note && (
          <p className="text-xs sm:text-sm text-muted-foreground italic px-1">{block.note}</p>
        )}
      </div>
    </div>
  );
}

function CoachingSection({ tips }: { tips: string[] }) {
  if (tips.length === 0) return null;
  return (
    <div className="rounded-xl border border-l-4 border-l-amber-500 bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b bg-amber-500/5">
        <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 shrink-0" />
        <h2 className="font-bold text-base sm:text-lg tracking-wide uppercase">Coaching Notes</h2>
        <Badge variant="outline" className="ml-auto text-[10px] sm:text-xs uppercase tracking-wider">tips</Badge>
      </div>
      <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-3">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-3">
            <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm sm:text-base">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function workoutToPlainText(workout: Partial<WorkoutOutput>): string {
  const lines: string[] = [];

  if (workout.warmup?.length) {
    lines.push("WARM-UP");
    workout.warmup.forEach((item, i) => {
      lines.push(`  ${i + 1}. ${item.name} — ${item.detail}`);
    });
    lines.push("");
  }

  if (workout.blocks?.length) {
    workout.blocks.forEach((block) => {
      const fmt = block.format ? ` (${formatLabels[block.format] || block.format})` : "";
      lines.push(`${block.name}${fmt}`);
      block.exercises?.forEach((ex) => {
        let line = `  ${ex.name}: ${ex.sets} sets × ${ex.reps} — rest ${ex.rest}`;
        if (ex.note) line += ` (${ex.note})`;
        lines.push(line);
      });
      if (block.note) lines.push(`  Note: ${block.note}`);
      lines.push("");
    });
  }

  if (workout.cooldown?.length) {
    lines.push("COOL-DOWN");
    workout.cooldown.forEach((item, i) => {
      lines.push(`  ${i + 1}. ${item.name} — ${item.detail}`);
    });
    lines.push("");
  }

  if (workout.coaching?.length) {
    lines.push("COACHING NOTES");
    workout.coaching.forEach((tip) => {
      lines.push(`  • ${tip}`);
    });
  }

  return lines.join("\n");
}

export function WorkoutView({ workout, isStreaming, error, onSave, onBack }: WorkoutViewProps) {
  function handleCopy() {
    if (!workout) return;
    navigator.clipboard.writeText(workoutToPlainText(workout));
    toast.success("Workout copied to clipboard");
  }

  if (error) {
    return (
      <div className="px-4 py-12 text-center space-y-4">
        <p className="text-destructive text-lg">{error}</p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  const hasContent = workout && (
    (workout.warmup && workout.warmup.length > 0) ||
    (workout.blocks && workout.blocks.length > 0) ||
    (workout.cooldown && workout.cooldown.length > 0) ||
    (workout.coaching && workout.coaching.length > 0)
  );

  return (
    <div className="pb-24">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> New Workout
        </Button>
        {isStreaming && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm ml-auto">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </div>
        )}
      </div>

      {/* Structured sections — render progressively */}
      {hasContent && (
        <div className="space-y-4">
          {workout.warmup && workout.warmup.length > 0 && (
            <WarmupSection items={workout.warmup} />
          )}

          {workout.blocks?.map((block, i) => (
            <BlockSection key={i} block={block} />
          ))}

          {workout.cooldown && workout.cooldown.length > 0 && (
            <CooldownSection items={workout.cooldown} />
          )}

          {workout.coaching && workout.coaching.length > 0 && (
            <CoachingSection tips={workout.coaching} />
          )}
        </div>
      )}

      {/* Streaming placeholder when no content yet */}
      {isStreaming && !hasContent && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Streaming indicator at the bottom */}
      {isStreaming && hasContent && (
        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Building workout...
        </div>
      )}

      {/* Bottom action bar */}
      {hasContent && !isStreaming && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm px-4 py-3">
          <div className="flex gap-3 max-w-2xl mx-auto">
            <Button variant="outline" className="flex-1" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            {onSave && (
              <Button className="flex-1" onClick={onSave}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
