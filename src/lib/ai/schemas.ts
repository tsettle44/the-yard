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
