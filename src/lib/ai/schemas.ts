import { z } from "zod";

export const generateWorkoutSchema = z.object({
  profile_id: z.string().min(1),
  gym_id: z.string().min(1),
  style: z.enum(["strength", "hiit", "circuit", "emom", "amrap", "tabata", "custom"]),
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
});

export type GenerateWorkoutInput = z.infer<typeof generateWorkoutSchema>;
