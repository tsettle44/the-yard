import { z } from "zod";

export const generateProgramSchema = z.object({
  profile_id: z.string().min(1).nullable(),
  gym_id: z.string().min(1).nullable(),
  template: z.enum(["ppl", "upper_lower", "full_body", "strength_builder", "custom"]),
  total_weeks: z.number().min(1).max(12),
  days_per_week: z.number().min(1).max(7),
  target_rpe: z.number().min(1).max(10),
  body_groups: z
    .array(z.enum(["chest", "back", "shoulders", "arms", "core", "legs", "glutes", "full_body"]))
    .min(1),
  parameters: z
    .object({
      supersets: z.boolean().optional(),
      circuits: z.boolean().optional(),
      dropsets: z.boolean().optional(),
      notes: z.string().optional(),
    })
    .optional()
    .default({}),
  bodyweight: z.boolean().optional(),
});

export type GenerateProgramInput = z.infer<typeof generateProgramSchema>;

// --- Program outline output schema (structured JSON from LLM) ---

const programDaySchema = z.object({
  day_number: z.number().describe("Day number within the week (1-based)"),
  name: z.string().describe("Day name (e.g. 'Push Day', 'Upper Body A')"),
  focus: z.string().describe("Muscle group focus (e.g. 'Chest, Shoulders, Triceps')"),
  body_groups: z
    .array(z.enum(["chest", "back", "shoulders", "arms", "core", "legs", "glutes", "full_body"]))
    .describe("Target body groups"),
  style: z
    .enum(["strength", "hiit", "circuit", "emom", "amrap", "tabata", "crossfit", "hyrox", "custom"])
    .describe("Workout style for this day"),
  duration_min: z.number().describe("Target duration in minutes"),
  target_rpe: z.number().describe("Target RPE for this day (1-10)"),
  key_lifts: z.array(z.string()).describe("2-4 key exercises for this day (e.g. 'Bench Press', 'OHP')"),
  notes: z.string().describe("Brief notes about this day's focus or progression"),
});

const programWeekSchema = z.object({
  week_number: z.number().describe("Week number (1-based)"),
  theme: z.string().describe("Week theme (e.g. 'Accumulation', 'Intensification', 'Deload')"),
  intensity_modifier: z.string().describe("How intensity changes this week (e.g. 'Moderate volume, moderate weight')"),
  days: z.array(programDaySchema).describe("Training days for this week"),
});

export const programOutlineOutputSchema = z.object({
  name: z.string().describe("Program name"),
  description: z.string().describe("Brief program description"),
  progression_strategy: z.string().describe("How the program progresses across weeks"),
  weeks: z.array(programWeekSchema).describe("Week-by-week plan"),
  coaching: z.array(z.string()).describe("2-4 coaching tips for the program"),
});

export type ProgramOutlineOutput = z.infer<typeof programOutlineOutputSchema>;

// --- Generate program day request schema ---

export const generateProgramDaySchema = z.object({
  program_outline: z.any(),
  week_number: z.number().min(1),
  day_number: z.number().min(1),
  profile_data: z.any().optional(),
  equipment_data: z.array(z.any()).optional(),
  shared_resources_data: z.array(z.any()).optional(),
  layout_notes: z.string().optional(),
  bodyweight: z.boolean().optional(),
});
