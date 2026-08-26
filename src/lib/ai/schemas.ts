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
  participant_count: z.number().int().min(1).max(6).optional().default(1),
  group_format: z.enum(["station_rotation", "shared"]).optional(),
}).superRefine((value, ctx) => {
  if (value.participant_count > 1 && !value.group_format) {
    ctx.addIssue({
      code: "custom",
      path: ["group_format"],
      message: "Group format is required for group workouts",
    });
  }

  if (value.participant_count === 1 && value.group_format) {
    ctx.addIssue({
      code: "custom",
      path: ["group_format"],
      message: "Group format is only valid for group workouts",
    });
  }
});

export type GenerateWorkoutInput = z.infer<typeof generateWorkoutSchema>;

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

const groupWorkoutAssignmentSchema = z.object({
  participant: z.number().describe("Integer participant number, starting at 1"),
  exercise: z.string().describe("Exercise assigned during this synchronized round"),
  work: z.string().describe("Work interval or rep target"),
  rest: z.string().describe("Rest or transition interval"),
  equipment_ids: z.array(z.string()).describe("Canonical equipment IDs occupied by this participant; empty for bodyweight"),
  note: z.string().optional().describe("Brief setup, scaling, or rotation guidance"),
});

const groupWorkoutRoundSchema = z.object({
  name: z.string().describe("Round or rotation name"),
  duration: z.string().describe("Total duration or timing for this synchronized round"),
  assignments: z.array(groupWorkoutAssignmentSchema).describe("Exactly one assignment per participant"),
});

export const groupWorkoutScheduleSchema = z.object({
  participant_count: z.number().describe("Integer number of participants"),
  format: z.enum(["station_rotation", "shared"]),
  rounds: z.array(groupWorkoutRoundSchema).min(1),
});

export const workoutOutputSchema = z.object({
  warmup: z.array(workoutListItemSchema).describe("Warm-up exercises"),
  blocks: z.array(workoutBlockSchema).describe("Main workout blocks"),
  cooldown: z.array(workoutListItemSchema).describe("Cool-down / stretching"),
  coaching: z.array(z.string()).describe("2-4 coaching tips"),
  group: groupWorkoutScheduleSchema.optional().describe("Required synchronized schedule for group workouts"),
});

export type WorkoutOutput = z.infer<typeof workoutOutputSchema>;
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;
export type WorkoutBlock = z.infer<typeof workoutBlockSchema>;
export type WorkoutListItem = z.infer<typeof workoutListItemSchema>;
