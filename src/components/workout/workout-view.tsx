"use client";

import { Button } from "@/components/ui/button";
import { Copy, Save, Loader2, ArrowLeft, Minus } from "lucide-react";
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
  straight: "STRAIGHT SETS",
  superset: "SUPERSET",
  circuit: "CIRCUIT",
  emom: "EMOM",
  amrap: "AMRAP",
  tabata: "TABATA",
};

function ExerciseCard({ exercise, index }: { exercise: Partial<WorkoutExercise>; index: number }) {
  return (
    <div className="border-b border-border/50 last:border-0 py-3 sm:py-4">
      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
        <p className="font-semibold text-sm sm:text-base uppercase tracking-wide">{exercise.name || "..."}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center ml-7">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Sets</p>
          <p className="text-xl sm:text-2xl font-black font-mono tabular-nums">{exercise.sets || "--"}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Reps</p>
          <p className="text-xl sm:text-2xl font-black font-mono tabular-nums">{exercise.reps || "--"}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Rest</p>
          <p className="text-xl sm:text-2xl font-black font-mono tabular-nums">{exercise.rest || "--"}</p>
        </div>
      </div>
      {exercise.note && (
        <p className="text-xs text-muted-foreground mt-2 ml-7">{exercise.note}</p>
      )}
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: Partial<WorkoutListItem>[] }) {
  if (items.length === 0) return null;
  return (
    <div className="border border-border rounded-none">
      <div className="px-4 py-3 sm:px-5 sm:py-3 border-b border-border">
        <h2 className="font-black text-xs sm:text-sm uppercase tracking-[0.2em]">{title}</h2>
      </div>
      <div className="px-4 py-2 sm:px-5 sm:py-3 divide-y divide-border/50">
        {items.map((item, i) => (
          <div key={i} className="flex items-baseline gap-3 py-2">
            <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-sm sm:text-base">{item.name || "..."}</span>
            <span className="text-sm text-muted-foreground ml-auto shrink-0 font-mono">{item.detail || "..."}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockSection({ block }: { block: Partial<WorkoutBlock> }) {
  return (
    <div className="border border-border rounded-none">
      <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3 border-b border-border">
        <h2 className="font-black text-xs sm:text-sm uppercase tracking-[0.2em]">{block.name || "..."}</h2>
        {block.format && (
          <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">
            {formatLabels[block.format] || block.format}
          </span>
        )}
      </div>
      <div className="px-4 sm:px-5">
        {block.exercises?.map((exercise, i) => (
          <ExerciseCard key={i} exercise={exercise} index={i} />
        ))}
      </div>
      {block.note && (
        <div className="px-4 sm:px-5 py-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">{block.note}</p>
        </div>
      )}
    </div>
  );
}

function CoachingSection({ tips }: { tips: string[] }) {
  if (tips.length === 0) return null;
  return (
    <div className="border border-border rounded-none">
      <div className="px-4 py-3 sm:px-5 sm:py-3 border-b border-border">
        <h2 className="font-black text-xs sm:text-sm uppercase tracking-[0.2em]">Notes</h2>
      </div>
      <div className="px-4 py-2 sm:px-5 sm:py-3 divide-y divide-border/50">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-3 py-2">
            <Minus className="h-3 w-3 text-muted-foreground shrink-0 mt-1.5" />
            <p className="text-sm">{tip}</p>
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
        let line = `  ${ex.name}: ${ex.sets} sets x ${ex.reps} — rest ${ex.rest}`;
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
    lines.push("NOTES");
    workout.coaching.forEach((tip) => {
      lines.push(`  - ${tip}`);
    });
  }

  return lines.join("\n");
}

export function WorkoutView({ workout, isStreaming, error, onSave, onBack }: WorkoutViewProps) {
  function handleCopy() {
    if (!workout) return;
    navigator.clipboard.writeText(workoutToPlainText(workout));
    toast.success("Copied to clipboard");
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
    <div className="pb-24 w-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-xs">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {isStreaming && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest ml-auto">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Building...
          </div>
        )}
      </div>

      {/* Structured sections */}
      {hasContent && (
        <div className="space-y-3">
          {workout.warmup && workout.warmup.length > 0 && (
            <ListSection title="Warm-Up" items={workout.warmup} />
          )}

          {workout.blocks?.map((block, i) => (
            <BlockSection key={i} block={block} />
          ))}

          {workout.cooldown && workout.cooldown.length > 0 && (
            <ListSection title="Cool-Down" items={workout.cooldown} />
          )}

          {workout.coaching && workout.coaching.length > 0 && (
            <CoachingSection tips={workout.coaching} />
          )}
        </div>
      )}

      {/* Streaming placeholder */}
      {isStreaming && !hasContent && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Streaming indicator at bottom */}
      {isStreaming && hasContent && (
        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-xs uppercase tracking-widest">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading...
        </div>
      )}

      {/* Bottom action bar */}
      {hasContent && !isStreaming && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3">
          <div className="flex gap-3 max-w-2xl mx-auto">
            <Button variant="outline" className="flex-1 text-xs rounded-none" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            {onSave && (
              <Button className="flex-1 text-xs rounded-none" onClick={onSave}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
