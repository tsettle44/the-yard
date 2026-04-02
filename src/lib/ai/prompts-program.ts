import { Profile } from "@/types/profile";
import { Equipment, SharedResourceGroup } from "@/types/gym";
import { BodyGroup, WorkoutParameters } from "@/types/workout";
import { ProgramTemplate, ProgramOutline, ProgramDay } from "@/types/program";

interface ProgramPromptContext {
  profile: Profile;
  equipment: Equipment[];
  sharedResources: SharedResourceGroup[];
  layoutNotes: string;
  template: ProgramTemplate;
  totalWeeks: number;
  daysPerWeek: number;
  targetRpe: number;
  bodyGroups: BodyGroup[];
  parameters: WorkoutParameters;
  bodyweight?: boolean;
}

interface ProgramDayPromptContext {
  profile: Profile;
  equipment: Equipment[];
  sharedResources: SharedResourceGroup[];
  layoutNotes: string;
  outline: ProgramOutline;
  weekNumber: number;
  dayNumber: number;
  day: ProgramDay;
  bodyweight?: boolean;
}

export function buildProgramSystemPrompt(bodyweight?: boolean): string {
  const equipmentRules = bodyweight
    ? `CRITICAL RULES:
1. Use ONLY bodyweight exercises. Do NOT suggest any equipment.
2. All exercises must be performable in a small open space with no equipment.
3. Include progressions and regressions in key lift suggestions where appropriate.`
    : `CRITICAL RULES — EQUIPMENT:
1. Only suggest key lifts and exercises the user can perform with their listed equipment.
2. Equipment quantities matter — keep this in mind when suggesting supersets or circuits.
3. Shared resource constraints must be respected across all days.`;

  return `You are an expert strength coach and periodization programmer. You design structured multi-week training programs with intelligent progression.

${equipmentRules}

PROGRAM DESIGN RULES:
- Design a program OUTLINE, not full workouts. Each day should list key lifts and focus areas, not complete exercise lists.
- Apply periodization principles: vary volume and intensity across weeks.
- Include a deload or lighter week for programs of 4+ weeks.
- Each day should have 2-4 key lifts that define the session.
- Progressive overload should be built into the week themes and intensity modifiers.
- Consider recovery between sessions — don't program the same muscle groups on consecutive days unless intentional (like PPL).

OUTPUT FORMAT:
- Give the program a descriptive name.
- Write a brief description and progression strategy.
- For each week: provide a theme, intensity modifier, and days.
- For each day: name, focus, body groups, style, duration, RPE, key lifts, and brief notes.
- Provide 2-4 coaching tips for the overall program.`;
}

export function buildProgramUserPrompt(ctx: ProgramPromptContext): string {
  const equipmentList = ctx.bodyweight
    ? "Bodyweight only — no equipment"
    : ctx.equipment.length > 0
      ? ctx.equipment
          .map((e) => {
            const qty = e.quantity > 1 ? ` x${e.quantity}` : "";
            return `- ${e.name}${qty} (${e.category})`;
          })
          .join("\n")
      : "Bodyweight only";

  const prefsLines: string[] = [];
  if (ctx.profile.preferences.injuries?.length) {
    prefsLines.push(`Injuries/limitations: ${ctx.profile.preferences.injuries.join(", ")}`);
  }
  if (ctx.profile.preferences.avoidedExercises?.length) {
    prefsLines.push(`Avoid these exercises: ${ctx.profile.preferences.avoidedExercises.join(", ")}`);
  }
  if (ctx.profile.preferences.notes) {
    prefsLines.push(`Additional notes: ${ctx.profile.preferences.notes}`);
  }

  const paramLines: string[] = [];
  if (ctx.parameters.supersets) paramLines.push("Include supersets where appropriate");
  if (ctx.parameters.circuits) paramLines.push("Use circuit-style programming");
  if (ctx.parameters.dropsets) paramLines.push("Include drop sets for hypertrophy");
  if (ctx.parameters.notes) paramLines.push(`Notes: ${ctx.parameters.notes}`);

  const templateNames: Record<ProgramTemplate, string> = {
    ppl: "Push / Pull / Legs",
    upper_lower: "Upper / Lower Split",
    full_body: "Full Body",
    strength_builder: "Strength Builder",
    custom: "Custom",
  };

  const gymSection = ctx.bodyweight
    ? ""
    : `
**Available Equipment:**
${equipmentList}
`;

  return `Design a ${ctx.totalWeeks}-week ${templateNames[ctx.template]} training program with the following specifications:

**Athlete Profile:**
- Name: ${ctx.profile.name}
- Fitness Level: ${ctx.profile.fitness_level}
- Goals: ${ctx.profile.goals || "General fitness"}
- Preferred Styles: ${ctx.profile.preferred_styles.join(", ") || "Any"}
${prefsLines.length > 0 ? prefsLines.map((l) => `- ${l}`).join("\n") : ""}

**Program Parameters:**
- Template: ${templateNames[ctx.template]}
- Duration: ${ctx.totalWeeks} weeks
- Training Days per Week: ${ctx.daysPerWeek}
- Target RPE: ${ctx.targetRpe}/10
- Body Groups: ${ctx.bodyGroups.join(", ")}
${paramLines.length > 0 ? paramLines.map((l) => `- ${l}`).join("\n") : ""}
${gymSection}
Design a complete program outline with week-by-week structure, daily focus areas, key lifts, and progression strategy.`;
}

export function buildProgramDaySystemPrompt(bodyweight?: boolean): string {
  const equipmentRules = bodyweight
    ? `CRITICAL RULES:
1. Use ONLY bodyweight exercises. Do NOT suggest any equipment.
2. All exercises must be performable in a small open space with no equipment.
3. Include progressions and regressions in exercise notes where appropriate.`
    : `CRITICAL RULES — EQUIPMENT CONSTRAINTS (you MUST follow these):
1. Only use equipment the user has listed.
2. Equipment quantities matter for supersets and circuits.
3. Shared resource constraints are HARD RULES.
4. Minimize total equipment transitions.`;

  return `You are an expert personal trainer generating a specific day's workout as part of a structured training program. You must follow the program outline's prescribed focus, intensity, and key lifts for this day.

${equipmentRules}

OTHER RULES:
- Include warm-up and cool-down.
- Provide sets, reps (or time), and rest periods for every exercise.
- Scale intensity to the target RPE for this specific day and week.
- The key lifts from the program outline MUST appear in the workout.
- Apply the week's intensity modifier to volume and weight selection.

OUTPUT FORMAT:
- Organize the main workout into logical blocks.
- Label each block format: "straight", "superset", "circuit", "emom", "amrap", or "tabata".
- Keep sets, reps, and rest as short strings.
- Provide 2-4 concise coaching tips specific to this day's workout.`;
}

export function buildProgramDayUserPrompt(ctx: ProgramDayPromptContext): string {
  const week = ctx.outline.weeks.find((w) => w.week_number === ctx.weekNumber);

  const equipmentList = ctx.bodyweight
    ? "Bodyweight only — no equipment"
    : ctx.equipment.length > 0
      ? ctx.equipment
          .map((e) => {
            const qty = e.quantity > 1 ? ` x${e.quantity}` : "";
            return `- ${e.name}${qty} (${e.category})`;
          })
          .join("\n")
      : "Bodyweight only";

  const prefsLines: string[] = [];
  if (ctx.profile.preferences.injuries?.length) {
    prefsLines.push(`Injuries/limitations: ${ctx.profile.preferences.injuries.join(", ")}`);
  }
  if (ctx.profile.preferences.avoidedExercises?.length) {
    prefsLines.push(`Avoid these exercises: ${ctx.profile.preferences.avoidedExercises.join(", ")}`);
  }

  const gymSection = ctx.bodyweight
    ? ""
    : `
**Available Equipment:**
${equipmentList}
`;

  return `Generate the full workout for **Week ${ctx.weekNumber}, Day ${ctx.dayNumber}** of the program "${ctx.outline.name}".

**Program Context:**
- Program: ${ctx.outline.name}
- Progression Strategy: ${ctx.outline.progression_strategy}
- Week ${ctx.weekNumber} Theme: ${week?.theme || "Standard"}
- Week Intensity: ${week?.intensity_modifier || "Moderate"}

**Today's Plan (from program outline):**
- Day Name: ${ctx.day.name}
- Focus: ${ctx.day.focus}
- Body Groups: ${ctx.day.body_groups.join(", ")}
- Style: ${ctx.day.style}
- Duration: ${ctx.day.duration_min} minutes
- Target RPE: ${ctx.day.target_rpe}/10
- Key Lifts: ${ctx.day.key_lifts.join(", ")}
- Notes: ${ctx.day.notes}

**Athlete Profile:**
- Name: ${ctx.profile.name}
- Fitness Level: ${ctx.profile.fitness_level}
- Goals: ${ctx.profile.goals || "General fitness"}
${prefsLines.length > 0 ? prefsLines.map((l) => `- ${l}`).join("\n") : ""}
${gymSection}
Generate a complete workout with warm-up, main workout blocks, and cool-down. The key lifts listed above MUST be included.`;
}
