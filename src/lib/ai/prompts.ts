import { Profile } from "@/types/profile";
import { Equipment, EquipmentConflict } from "@/types/gym";
import { WorkoutStyle, BodyGroup, WorkoutParameters } from "@/types/workout";

interface PromptContext {
  profile: Profile;
  equipment: Equipment[];
  conflicts: EquipmentConflict[];
  style: WorkoutStyle;
  durationMin: number;
  targetRpe: number;
  bodyGroups: BodyGroup[];
  parameters: WorkoutParameters;
}

export function buildSystemPrompt(): string {
  return `You are an expert personal trainer and workout programmer. You create detailed, safe, and effective workouts tailored to the user's equipment, fitness level, and goals.

Rules:
- Only use equipment the user has listed. Never suggest equipment they don't have.
- Respect equipment conflicts: if two pieces of equipment conflict, never program them in the same superset or circuit block.
- Include warm-up and cool-down unless the user opts out.
- Provide sets, reps (or time), and rest periods for every exercise.
- Scale intensity to the target RPE.
- Use proper exercise names and include brief form cues for non-obvious movements.

Output guidance:
- Organize the main workout into logical blocks (e.g. "Block A — Chest & Triceps").
- Label each block with the correct format: "straight" for standard sets, "superset" for paired exercises, "circuit" for 3+ exercises cycled, or "emom"/"amrap"/"tabata" for timed formats.
- Keep sets, reps, and rest as short strings (e.g. "3", "8-10", "60s").
- Provide 2-4 concise, actionable coaching tips specific to this workout.`;
}

export function buildUserPrompt(ctx: PromptContext): string {
  const equipmentList = ctx.equipment
    .map((e) => `- ${e.name} (${e.category})`)
    .join("\n");

  const conflictList =
    ctx.conflicts.length > 0
      ? ctx.conflicts
          .map((c) => {
            const eqA = ctx.equipment.find((e) => e.id === c.equipment_a);
            const eqB = ctx.equipment.find((e) => e.id === c.equipment_b);
            return `- ${eqA?.name || c.equipment_a} <-> ${eqB?.name || c.equipment_b}: ${c.reason}`;
          })
          .join("\n")
      : "None";

  const bodyGroupsStr = ctx.bodyGroups.join(", ");

  const prefsLines: string[] = [];
  if (ctx.profile.preferences.injuries?.length) {
    prefsLines.push(`Injuries/limitations: ${ctx.profile.preferences.injuries.join(", ")}`);
  }
  if (ctx.profile.preferences.avoidedExercises?.length) {
    prefsLines.push(`Avoid these exercises: ${ctx.profile.preferences.avoidedExercises.join(", ")}`);
  }
  if (ctx.profile.preferences.warmupDuration) {
    prefsLines.push(`Warm-up duration: ${ctx.profile.preferences.warmupDuration} minutes`);
  }
  if (ctx.profile.preferences.cooldownDuration) {
    prefsLines.push(`Cool-down duration: ${ctx.profile.preferences.cooldownDuration} minutes`);
  }
  if (ctx.profile.preferences.notes) {
    prefsLines.push(`Additional notes: ${ctx.profile.preferences.notes}`);
  }

  const paramLines: string[] = [];
  if (ctx.parameters.supersets) paramLines.push("Include supersets where appropriate");
  if (ctx.parameters.circuits) paramLines.push("Use circuit-style programming");
  if (ctx.parameters.dropsets) paramLines.push("Include drop sets for hypertrophy");
  if (ctx.parameters.notes) paramLines.push(`Notes: ${ctx.parameters.notes}`);

  return `Generate a ${ctx.style} workout with the following specifications:

**Athlete Profile:**
- Name: ${ctx.profile.name}
- Fitness Level: ${ctx.profile.fitness_level}
- Goals: ${ctx.profile.goals || "General fitness"}
- Preferred Styles: ${ctx.profile.preferred_styles.join(", ") || "Any"}
${prefsLines.length > 0 ? prefsLines.map((l) => `- ${l}`).join("\n") : ""}

**Workout Parameters:**
- Duration: ${ctx.durationMin} minutes
- Target RPE: ${ctx.targetRpe}/10
- Body Groups: ${bodyGroupsStr}
- Style: ${ctx.style}
${paramLines.length > 0 ? paramLines.map((l) => `- ${l}`).join("\n") : ""}

**Available Equipment:**
${equipmentList || "Bodyweight only"}

**Equipment Conflicts (cannot be used in same superset/circuit):**
${conflictList}

Please generate a complete workout with warm-up, main workout blocks, and cool-down.`;
}
