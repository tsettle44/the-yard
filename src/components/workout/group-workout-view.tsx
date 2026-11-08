"use client";

import { Button } from "@/components/ui/button";
import { Copy, Save, Loader2, ArrowLeft, Minus } from "lucide-react";
import { toast } from "sonner";
import type { SavedGroupWorkout, GroupAssignment } from "@/lib/ai/schemas";

interface GroupWorkoutViewProps {
  workout: SavedGroupWorkout | null;
  groupSize: number;
  isLoading?: boolean;
  error?: string | null;
  violations?: string[];
  onSave?: () => void;
  onBack?: () => void;
  /** Hides the back button and fixed action bar (e.g. inside a history card). */
  embedded?: boolean;
}

const formatLabels: Record<string, string> = {
  straight: "STRAIGHT SETS",
  superset: "SUPERSET",
  circuit: "CIRCUIT",
  emom: "EMOM",
  amrap: "AMRAP",
  tabata: "TABATA",
};

const columnClasses: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2",
  5: "sm:grid-cols-3",
  6: "sm:grid-cols-3",
};

function personLabel(workout: SavedGroupWorkout, person: number): string {
  return workout.person_names?.[person]?.trim() || `Person ${person + 1}`;
}

function equipmentLabel(workout: SavedGroupWorkout, id: string): string {
  return workout.equipment_names?.[id] || id;
}

function AssignmentCard({
  workout,
  person,
  assignment,
}: {
  workout: SavedGroupWorkout;
  person: number;
  assignment: GroupAssignment | undefined;
}) {
  return (
    <div className="border border-border/60 p-3 space-y-2" data-testid={`person-${person}`}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {personLabel(workout, person)}
      </p>
      {assignment ? (
        <>
          <p className="font-semibold text-sm uppercase tracking-wide">{assignment.name}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Sets</p>
              <p className="text-lg font-black font-mono tabular-nums">{assignment.sets}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Reps</p>
              <p className="text-lg font-black font-mono tabular-nums">{assignment.reps}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Rest</p>
              <p className="text-lg font-black font-mono tabular-nums">{assignment.rest}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {assignment.equipment_ids.length === 0 ? (
              <span className="text-[10px] font-mono uppercase tracking-widest border border-border px-1.5 py-0.5 text-muted-foreground">
                Bodyweight
              </span>
            ) : (
              assignment.equipment_ids.map((id) => (
                <span
                  key={id}
                  className="text-[10px] font-mono uppercase tracking-widest border border-border px-1.5 py-0.5"
                >
                  {equipmentLabel(workout, id)}
                </span>
              ))
            )}
          </div>
          {assignment.note && <p className="text-xs text-muted-foreground">{assignment.note}</p>}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: { name: string; detail: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="border border-border rounded-none">
      <div className="px-4 py-3 sm:px-5 border-b border-border">
        <h2 className="font-black text-xs sm:text-sm uppercase tracking-[0.2em]">{title}</h2>
      </div>
      <div className="px-4 py-2 sm:px-5 sm:py-3 divide-y divide-border/50">
        {items.map((item, i) => (
          <div key={i} className="flex items-baseline gap-3 py-2">
            <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-sm sm:text-base">{item.name}</span>
            <span className="text-sm text-muted-foreground ml-auto shrink-0 font-mono">{item.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function groupWorkoutToPlainText(workout: SavedGroupWorkout, groupSize: number): string {
  const lines: string[] = [];

  if (workout.warmup.length) {
    lines.push("WARM-UP (everyone)");
    workout.warmup.forEach((item, i) => lines.push(`  ${i + 1}. ${item.name} — ${item.detail}`));
    lines.push("");
  }

  workout.blocks.forEach((block) => {
    lines.push(`${block.name} (${formatLabels[block.format] || block.format})`);
    if (block.note) lines.push(`  Note: ${block.note}`);
    block.slots.forEach((slot, si) => {
      lines.push(`  Slot ${si + 1}`);
      for (let p = 0; p < groupSize; p++) {
        const a = slot.assignments.find((x) => x.person === p);
        if (!a) continue;
        const gear = a.equipment_ids.length
          ? a.equipment_ids.map((id) => equipmentLabel(workout, id)).join(", ")
          : "Bodyweight";
        let line = `    ${personLabel(workout, p)}: ${a.name} — ${a.sets} x ${a.reps}, rest ${a.rest} [${gear}]`;
        if (a.note) line += ` (${a.note})`;
        lines.push(line);
      }
    });
    lines.push("");
  });

  if (workout.cooldown.length) {
    lines.push("COOL-DOWN (everyone)");
    workout.cooldown.forEach((item, i) => lines.push(`  ${i + 1}. ${item.name} — ${item.detail}`));
    lines.push("");
  }

  if (workout.coaching.length) {
    lines.push("NOTES");
    workout.coaching.forEach((tip) => lines.push(`  - ${tip}`));
  }

  return lines.join("\n");
}

export function GroupWorkoutView({
  workout,
  groupSize,
  isLoading = false,
  error = null,
  violations = [],
  onSave,
  onBack,
  embedded = false,
}: GroupWorkoutViewProps) {
  function handleCopy() {
    if (!workout) return;
    navigator.clipboard.writeText(groupWorkoutToPlainText(workout, groupSize));
    toast.success("Copied to clipboard");
  }

  if (error) {
    return (
      <div className="px-4 py-12 text-center space-y-4" role="alert">
        <p className="text-destructive text-lg">{error}</p>
        {violations.length > 0 && (
          <details className="text-left text-xs text-muted-foreground max-w-md mx-auto">
            <summary className="cursor-pointer uppercase tracking-widest font-mono">
              What went wrong ({violations.length})
            </summary>
            <ul className="mt-2 space-y-1 list-disc pl-4">
              {violations.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </details>
        )}
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Try Again
          </Button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="pb-24 w-full">
        {onBack && !embedded && (
          <div className="mb-6">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-xs">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          </div>
        )}
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground" role="status">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-xs uppercase tracking-widest">Designing a conflict-free plan…</p>
        </div>
      </div>
    );
  }

  if (!workout) return null;

  const gridClass = columnClasses[groupSize] || "sm:grid-cols-2";

  return (
    <div className={embedded ? "w-full" : "pb-24 w-full"}>
      {onBack && !embedded && (
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-xs">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Group · {groupSize} people
          </span>
        </div>
      )}

      <div className="space-y-3">
        <ListSection title="Warm-Up" items={workout.warmup} />

        {workout.blocks.map((block, bi) => (
          <div key={bi} className="border border-border rounded-none">
            <div className="flex items-center justify-between px-4 py-3 sm:px-5 border-b border-border">
              <h2 className="font-black text-xs sm:text-sm uppercase tracking-[0.2em]">{block.name}</h2>
              <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {formatLabels[block.format] || block.format}
              </span>
            </div>
            <div className="px-4 py-3 sm:px-5 space-y-4">
              {block.slots.map((slot, si) => (
                <div key={si} className="space-y-2" data-testid={`slot-${bi}-${si}`}>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Slot {si + 1}
                  </p>
                  <div className={`grid grid-cols-1 gap-2 ${gridClass}`}>
                    {Array.from({ length: groupSize }, (_, p) => (
                      <AssignmentCard
                        key={p}
                        workout={workout}
                        person={p}
                        assignment={slot.assignments.find((a) => a.person === p)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {block.note && (
              <div className="px-4 sm:px-5 py-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">{block.note}</p>
              </div>
            )}
          </div>
        ))}

        <ListSection title="Cool-Down" items={workout.cooldown} />

        {workout.coaching.length > 0 && (
          <div className="border border-border rounded-none">
            <div className="px-4 py-3 sm:px-5 border-b border-border">
              <h2 className="font-black text-xs sm:text-sm uppercase tracking-[0.2em]">Notes</h2>
            </div>
            <div className="px-4 py-2 sm:px-5 sm:py-3 divide-y divide-border/50">
              {workout.coaching.map((tip, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <Minus className="h-3 w-3 text-muted-foreground shrink-0 mt-1.5" />
                  <p className="text-sm">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!embedded && (
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
