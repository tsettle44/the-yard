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

// --- Group workouts ---

export interface GroupPromptContext extends PromptContext {
  groupSize: number;
  personNames?: string[];
}

const GROUP_OUTPUT_RULES = `OUTPUT FORMAT:
- warmup and cooldown are done by everyone together (simple lists).
- blocks[]: each block has a name, a format, an optional note, and slots[].
- slots[] are consecutive time periods performed IN ORDER. Within one slot ALL people train at the same time.
- Each slot has assignments[] with EXACTLY ONE assignment per person. "person" is a 0-based index: 0, 1, ... N-1. Never skip a person, never repeat a person in the same slot.
- Each assignment has: person, name (exercise), sets, reps, rest (short strings such as "3", "8-10", "60s"), an optional note, and equipment_ids.
- equipment_ids lists the EXACT id strings from the equipment list for every piece of equipment that exercise uses. Use an empty array [] for bodyweight exercises. Never put equipment names in equipment_ids, and never invent ids.
- Provide 2-4 concise coaching tips.
- Keep the plan compact: prefer a modest number of slots per block, and keep notes short.`;

export function buildGroupSystemPrompt(groupSize: number, bodyweight?: boolean): string {
  const lastIndex = groupSize - 1;

  const model = `GROUP WORKOUT MODEL:
You are scheduling ${groupSize} people (indexes 0 to ${lastIndex}) who train TOGETHER at the same time in the same space. The workout is a schedule of time SLOTS. In every slot every person does one exercise simultaneously.

Where possible, keep everyone on the same body group or movement pattern within a slot (e.g. everyone does a pushing movement), but give each person a DIFFERENT exercise or a different piece of equipment whenever equipment limits require it. When people use different gear, rotate them in later slots so everyone eventually gets the same work.`;

  if (bodyweight) {
    return `You are an expert personal trainer who programs group bodyweight workouts. ${model}

CRITICAL RULES:
1. This is a BODYWEIGHT-ONLY workout. Every assignment must have an EMPTY equipment_ids array. Do not use any equipment (no dumbbells, bands, pull-up bars, etc.).
2. All exercises must be performable in a small open space.
3. Include progressions/regressions in notes where useful.

OTHER RULES:
- Include a warm-up and cool-down.
- Scale intensity to the target RPE.
- Use proper exercise names with brief form cues for non-obvious movements.

${GROUP_OUTPUT_RULES}`;
  }

  return `You are an expert personal trainer who programs group workouts for a gym with limited equipment. ${model}

CRITICAL RULES — EQUIPMENT QUANTITIES (HARD CONSTRAINT, checked by an automated validator; invalid plans are rejected):

1. Every equipment item has a quantity. In any single slot, the number of DIFFERENT people using an item must be LESS THAN OR EQUAL TO its quantity. If a gym has 1 barbell, at most ONE person may use the barbell in a slot. If it has 2 dumbbell sets, at most TWO people may use dumbbells in a slot.
2. When more people want an item than its quantity allows, give the extra people a different exercise that uses other equipment (or bodyweight) in that slot, then rotate them in later slots.
3. Only use equipment from the list provided, and reference it by its exact id in equipment_ids. If an exercise uses several items (e.g. barbell + bench), list all of them.
4. Count carefully: before finalizing each slot, tally how many people list each id and make sure that tally never exceeds that item's quantity.

CRITICAL RULES — SHARED RESOURCE GROUPS (HARD CONSTRAINT):
- NEVER TOGETHER: use only ONE item from the group in the ENTIRE workout (across all blocks and slots). Pick one and never use the others.
- NO SUPERSET: at most ONE person may use ANY equipment from the group in a given slot. Other people must do something that uses no equipment from that group.
- NEEDS SETUP CHANGE: same as NO SUPERSET for concurrent use — at most ONE person may use any equipment from the group in a given slot.
- GROUP TOGETHER: keep exercises that use this group's equipment in the same or consecutive blocks.

WORKED EXAMPLE (barbell quantity 1, dumbbells quantity 2, 2 people):
- Slot 1: person 0 = Barbell Back Squat (equipment_ids: ["<barbell id>"]); person 1 = Dumbbell Goblet Squat (equipment_ids: ["<dumbbell id>"]).
- Slot 2 (swap): person 0 = Dumbbell Goblet Squat; person 1 = Barbell Back Squat.
Never put both people on the barbell in the same slot. With 4 people and 1 barbell, one person is on the barbell while the others use dumbbells, cables or bodyweight, and the barbell rotates each slot.

OTHER RULES:
- Include a warm-up and cool-down.
- Scale intensity to the target RPE.
- Use proper exercise names with brief form cues for non-obvious movements.
- Mention swaps/rotations in the assignment note when helpful (e.g. "Swap with person 1 next slot").

${GROUP_OUTPUT_RULES}`;
}

export function buildGroupUserPrompt(ctx: GroupPromptContext): string {
  const n = ctx.groupSize;

  const people = Array.from({ length: n }, (_, i) => {
    const name = ctx.personNames?.[i]?.trim();
    return name ? `- Person ${i}: ${name}` : `- Person ${i}`;
  }).join("\n");

  const equipmentList = ctx.equipment
    .map((e) => `- ${e.name} — id: "${e.id}" — quantity: ${e.quantity} (${e.category})`)
    .join("\n");

  const constraintLabel: Record<string, string> = {
    never_together: "NEVER TOGETHER — use only ONE of these items in the entire workout",
    no_superset: "NO SUPERSET — at most one person may use any of these in the same slot",
    group_together: "GROUP TOGETHER — schedule exercises using these in the same or consecutive blocks",
    needs_setup_change: "NEEDS SETUP CHANGE — at most one person may use any of these in the same slot",
  };

  const sharedResourcesSection =
    ctx.sharedResources.length > 0
      ? ctx.sharedResources
          .map((sr) => {
            const items = sr.equipment_ids
              .map((id) => {
                const eq = ctx.equipment.find((e) => e.id === id);
                return eq ? `${eq.name} (id: "${id}")` : `id: "${id}"`;
              })
              .join(", ");
            const notesStr = sr.notes ? ` (${sr.notes})` : "";
            return `- ${sr.resource_name}: [${items}] → ${constraintLabel[sr.constraint] || sr.constraint}${notesStr}`;
          })
          .join("\n")
      : "None defined";

  const neverTogetherPlanning = ctx.sharedResources
    .filter((sr) => sr.constraint === "never_together")
    .map((sr) => {
      const items = sr.equipment_ids
        .map((id) => ctx.equipment.find((e) => e.id === id)?.name || id)
        .join(", ");
      return `- "${sr.resource_name}": FIRST choose exactly ONE of [${items}] (or none) and write it down in your head. Every other item in this group is FORBIDDEN in every block and slot, including finishers and AMRAPs. Build the whole workout around that one choice.`;
    })
    .join("\n");
  const sharedResourcesFullSection = neverTogetherPlanning
    ? `${sharedResourcesSection}\n\nPLANNING STEP (do this before writing any slot):\n${neverTogetherPlanning}`
    : sharedResourcesSection;

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

  const header = `Generate a ${ctx.bodyweight ? "bodyweight-only " : ""}${ctx.style} GROUP workout for ${n} people training at the same time.

**People (${n}):**
${people}

**Group Profile (one profile applies to everyone):**
- Name: ${ctx.profile.name}
- Fitness Level: ${ctx.profile.fitness_level}
- Goals: ${ctx.profile.goals || "General fitness"}
- Preferred Styles: ${ctx.profile.preferred_styles.join(", ") || "Any"}
${prefsLines.length > 0 ? prefsLines.map((l) => `- ${l}`).join("\n") : ""}

**Workout Parameters:**
- Duration: ${ctx.durationMin} minutes
- Target RPE: ${ctx.targetRpe}/10
- Body Groups: ${ctx.bodyGroups.join(", ")}
- Style: ${ctx.style}
${paramLines.length > 0 ? paramLines.map((l) => `- ${l}`).join("\n") : ""}`;

  if (ctx.bodyweight) {
    return `${header}

Generate a complete bodyweight-only group workout. Every person appears exactly once in every slot (person indexes 0 to ${n - 1}) and every equipment_ids array must be empty.`;
  }

  const layoutSection = ctx.layoutNotes?.trim() || "No layout notes provided";

  return `${header}

**Available Equipment (use the exact id in equipment_ids; quantity = max people using it at the same moment):**
${equipmentList || "None"}

**Shared Resources & Constraints (HARD RULES):**
${sharedResourcesFullSection}

**Gym Layout:**
${layoutSection}

Generate a complete group workout. Every person (indexes 0 to ${n - 1}) appears exactly once in every slot. In EVERY slot, the number of people using any equipment item must never exceed that item's quantity, and every shared resource rule above must hold. Where an item is scarce, put the other people on different equipment or bodyweight and rotate.`;
}
