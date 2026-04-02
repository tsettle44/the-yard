import { Profile } from "@/types/profile";
import { Equipment, SharedResourceGroup } from "@/types/gym";
import { WorkoutStyle, BodyGroup, WorkoutParameters } from "@/types/workout";

interface PromptContext {
  profile: Profile;
  equipment: Equipment[];
  sharedResources: SharedResourceGroup[];
  layoutNotes: string;
  style: WorkoutStyle;
  durationMin: number;
  targetRpe: number;
  bodyGroups: BodyGroup[];
  parameters: WorkoutParameters;
  bodyweight?: boolean;
}

export function buildSystemPrompt(bodyweight?: boolean): string {
  if (bodyweight) {
    return `You are an expert personal trainer and bodyweight workout programmer. You create detailed, safe, and effective workouts using only bodyweight exercises — no equipment required.

CRITICAL RULES:
1. Use ONLY bodyweight exercises. Do NOT suggest any equipment (dumbbells, barbells, bands, pull-up bars, etc.).
2. All exercises must be performable in a small open space with no equipment.
3. Include progressions and regressions in exercise notes where appropriate (e.g. "Scale down: knee push-ups" or "Scale up: archer push-ups").

OTHER RULES:
- Include warm-up and cool-down unless the user opts out.
- Provide sets, reps (or time), and rest periods for every exercise.
- Scale intensity to the target RPE.
- Use proper exercise names and include brief form cues for non-obvious movements.

OUTPUT FORMAT:
- Organize the main workout into logical blocks (e.g. "Block A — Chest & Triceps").
- Label each block format: "straight", "superset", "circuit", "emom", "amrap", or "tabata".
- Keep sets, reps, and rest as short strings (e.g. "3", "8-10", "60s").
- Provide 2-4 concise, actionable coaching tips specific to this workout.`;
  }

  return `You are an expert personal trainer and workout programmer for home gyms. You create detailed, safe, and effective workouts tailored to the user's equipment, fitness level, and goals.

CRITICAL RULES — EQUIPMENT CONSTRAINTS (you MUST follow these):

1. Only use equipment the user has listed. Never suggest equipment they don't have.

2. Equipment quantities matter. If the user has 1 barbell, you CANNOT superset or circuit two exercises that both need that barbell. They must be done as straight sets, one after the other.

3. Shared resource constraints are HARD RULES, not suggestions. You must obey every one:

   NEVER TOGETHER: Pick only ONE piece of equipment from this group for the entire workout. Do NOT include exercises from multiple items in a "never_together" group. This is the strictest constraint — treat it as an absolute ban.

   NO SUPERSET: Equipment in this group must NEVER appear in the same superset or circuit block. They CAN both appear in the workout, but always in separate straight-set blocks.

   GROUP TOGETHER: All exercises using equipment from this group must be scheduled in the same block or in consecutive blocks. Do not scatter them across the workout. Put compound movements first, then accessories.

   NEEDS SETUP CHANGE: These can follow each other but transitions are costly. Minimize back-and-forth. When a transition happens, add a note to the exercise (e.g. "Clear barbell, set up trap bar").

4. Minimize total equipment transitions across the entire workout. Think about the physical flow: group exercises by station so the user isn't walking back and forth.

5. When a setup change is needed between exercises, note it in the exercise note field.

OTHER RULES:
- Include warm-up and cool-down unless the user opts out.
- Provide sets, reps (or time), and rest periods for every exercise.
- Scale intensity to the target RPE.
- Use proper exercise names and include brief form cues for non-obvious movements.

OUTPUT FORMAT:
- Organize the main workout into logical blocks (e.g. "Block A — Chest & Triceps").
- Label each block format: "straight", "superset", "circuit", "emom", "amrap", or "tabata".
- Keep sets, reps, and rest as short strings (e.g. "3", "8-10", "60s").
- Provide 2-4 concise, actionable coaching tips specific to this workout.`;
}

export function buildUserPrompt(ctx: PromptContext): string {
  const equipmentList = ctx.equipment
    .map((e) => {
      const qty = e.quantity > 1 ? ` x${e.quantity}` : "";
      return `- ${e.name}${qty} (${e.category})`;
    })
    .join("\n");

  const constraintLabel: Record<string, string> = {
    never_together: "NEVER TOGETHER — only use ONE of these in the entire workout, exclude the rest completely",
    no_superset: "NO SUPERSET — never pair in same superset/circuit, but both can appear in separate straight-set blocks",
    group_together: "GROUP TOGETHER — schedule all exercises using these back-to-back in the same block",
    needs_setup_change: "NEEDS SETUP CHANGE — minimize transitions between these, add setup notes when switching",
  };

  const sharedResourcesSection =
    ctx.sharedResources.length > 0
      ? ctx.sharedResources
          .map((sr) => {
            const eqNames = sr.equipment_ids
              .map((id) => ctx.equipment.find((e) => e.id === id)?.name || id)
              .join(", ");
            const notesStr = sr.notes ? ` (${sr.notes})` : "";
            return `- ${sr.resource_name}: [${eqNames}] → ${constraintLabel[sr.constraint] || sr.constraint}${notesStr}`;
          })
          .join("\n")
      : "None defined";

  const layoutSection = ctx.layoutNotes?.trim() || "No layout notes provided";

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

  if (ctx.bodyweight) {
    return `Generate a bodyweight-only ${ctx.style} workout with the following specifications:

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

Generate a complete bodyweight-only workout with warm-up, main workout blocks, and cool-down. Use NO equipment — all exercises must be performable with just the body.`;
  }

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

**Shared Resources & Constraints (MUST OBEY):**
${sharedResourcesSection}

**Gym Layout:**
${layoutSection}

Generate a complete workout with warm-up, main workout blocks, and cool-down. You MUST respect every shared resource constraint listed above — these represent physical limitations of the gym that cannot be ignored.`;
}
