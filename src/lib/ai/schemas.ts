import { z } from "zod";

export const generateWorkoutSchema = z.object({
  profile_id: z.string().min(1).nullable(),
  gym_id: z.string().min(1).nullable(),
  style: z.enum(["strength", "hiit", "circuit", "emom", "amrap", "tabata", "crossfit", "hyrox", "custom"]),
  duration_min: z.number().min(5).max(180),
  target_rpe: z.number().min(1).max(10),
  body_groups: z.array(
    z.enum(["chest", "back", "shoulders", "arms", "core", "legs", "glutes", "full_body"])
  ).min(1),
  parameters: z.object({
    supersets: z.boolean().optional(),
    circuits: z.boolean().optional(),
    dropsets: z.boolean().optional(),
    notes: z.string().optional(),
  }).optional().default({}),
  bodyweight: z.boolean().optional(),
});

export type GenerateWorkoutInput = z.infer<typeof generateWorkoutSchema>;

export const MIN_GROUP_SIZE = 2;
export const MAX_GROUP_SIZE = 6;

export const generateGroupWorkoutSchema = generateWorkoutSchema
  .extend({
    group_size: z.number().int().min(MIN_GROUP_SIZE).max(MAX_GROUP_SIZE),
    person_names: z.array(z.string().trim().max(40)).max(MAX_GROUP_SIZE).optional(),
  })
  .refine((v) => !v.person_names || v.person_names.length <= v.group_size, {
    message: "person_names cannot have more entries than group_size",
    path: ["person_names"],
  });

export type GenerateGroupWorkoutInput = z.infer<typeof generateGroupWorkoutSchema>;

// --- Workout output schema (structured JSON from LLM) ---

const workoutListItemSchema = z.object({
  name: z.string().describe("Exercise or activity name"),
  detail: z.string().describe("Duration, reps, or instruction (e.g. '30s', '10 each side')"),
});

const workoutExerciseSchema = z.object({
  name: z.string().describe("Exercise name"),
  sets: z.string().describe("Number of sets (e.g. '3', '3-4')"),
  reps: z.string().describe("Reps, time, or distance (e.g. '8-10', '30s', 'AMRAP')"),
  rest: z.string().describe("Rest period (e.g. '60s', '90s', 'none')"),
  note: z.string().optional().describe("Brief form cue or tempo guidance"),
});

const workoutBlockSchema = z.object({
  name: z.string().describe("Block name (e.g. 'Block A — Chest & Triceps')"),
  format: z.enum(["straight", "superset", "circuit", "emom", "amrap", "tabata"]).describe("Block format"),
  exercises: z.array(workoutExerciseSchema).describe("Exercises in this block"),
  note: z.string().optional().describe("Overall block note (e.g. 'Rest 2 min between rounds')"),
});

export const workoutOutputSchema = z.object({
  warmup: z.array(workoutListItemSchema).describe("Warm-up exercises"),
  blocks: z.array(workoutBlockSchema).describe("Main workout blocks"),
  cooldown: z.array(workoutListItemSchema).describe("Cool-down / stretching"),
  coaching: z.array(z.string()).describe("2-4 coaching tips"),
});

export type WorkoutOutput = z.infer<typeof workoutOutputSchema>;
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;
export type WorkoutBlock = z.infer<typeof workoutBlockSchema>;
export type WorkoutListItem = z.infer<typeof workoutListItemSchema>;

// --- Group workout output schema ---

const groupAssignmentSchema = z.object({
  person: z.number().int().describe("0-based person index (0 to group_size-1). Each person appears exactly once per slot"),
  name: z.string().describe("Exercise name for this person in this slot"),
  sets: z.string().describe("Number of sets (e.g. '3', '3-4')"),
  reps: z.string().describe("Reps, time, or distance (e.g. '8-10', '30s')"),
  rest: z.string().describe("Rest period (e.g. '60s', 'none')"),
  note: z.string().optional().describe("Brief form cue or swap instruction"),
  equipment_ids: z
    .array(z.string())
    .describe("Exact equipment IDs from the equipment list used by this exercise. Empty array for bodyweight exercises"),
});

const groupSlotSchema = z.object({
  assignments: z
    .array(groupAssignmentSchema)
    .describe("One assignment per person; all of them are performed at the same time"),
});

const groupBlockSchema = z.object({
  name: z.string().describe("Block name (e.g. 'Block A — Upper Push')"),
  format: z.enum(["straight", "superset", "circuit", "emom", "amrap", "tabata"]).describe("Block format"),
  note: z.string().optional().describe("Overall block note (e.g. 'Swap stations after each slot')"),
  slots: z.array(groupSlotSchema).describe("Consecutive time slots, performed in order"),
});

export const groupWorkoutOutputSchema = z.object({
  warmup: z.array(workoutListItemSchema).describe("Warm-up exercises everyone does together"),
  blocks: z.array(groupBlockSchema).describe("Main workout blocks made of time slots"),
  cooldown: z.array(workoutListItemSchema).describe("Cool-down / stretching everyone does together"),
  coaching: z.array(z.string()).describe("2-4 coaching tips"),
});

export type GroupWorkoutOutput = z.infer<typeof groupWorkoutOutputSchema>;
export type GroupAssignment = z.infer<typeof groupAssignmentSchema>;
export type GroupSlot = z.infer<typeof groupSlotSchema>;
export type GroupBlock = z.infer<typeof groupBlockSchema>;

// Shape persisted in workouts.structured for group workouts. Display names are
// resolved client-side at save time so history renders without the original gym.
export const savedGroupWorkoutSchema = groupWorkoutOutputSchema.extend({
  person_names: z.array(z.string()).optional(),
  equipment_names: z.record(z.string(), z.string()).optional(),
});

export type SavedGroupWorkout = z.infer<typeof savedGroupWorkoutSchema>;

export function parseSavedGroupWorkout(
  structured: unknown,
  parameters: { group_size?: number } | null | undefined
): SavedGroupWorkout | null {
  if (!parameters?.group_size || !structured) return null;
  const parsed = savedGroupWorkoutSchema.safeParse(structured);
  return parsed.success ? parsed.data : null;
}
