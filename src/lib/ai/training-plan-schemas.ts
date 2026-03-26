import { z } from "zod";

export const generateTrainingPlanSchema = z.object({
  event_type: z.enum([
    "marathon", "half_marathon", "10k", "5k", "hyrox", "spartan_race",
    "triathlon", "century_ride", "crossfit_competition", "powerlifting_meet",
    "general_fitness", "custom",
  ]),
  event_name: z.string().min(1),
  event_date: z.string().min(1),
  experience_level: z.enum(["beginner", "intermediate", "advanced", "elite"]),
  available_days: z.array(
    z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])
  ).min(1),
  hours_per_day: z.number().min(0.5).max(6),
  goals: z.string().optional().default(""),
  current_fitness: z.string().optional().default(""),
  injuries_limitations: z.string().optional().default(""),
  additional_notes: z.string().optional().default(""),
});

const trainingSessionSchema = z.object({
  date: z.string().describe("ISO date string (YYYY-MM-DD)"),
  day_of_week: z.string().describe("Day name (e.g. Monday)"),
  title: z.string().describe("Short session title (e.g. 'Easy Run', 'Tempo Intervals')"),
  type: z.string().describe("Session type: run, strength, rest, cross-training, swim, bike, race, recovery"),
  duration_minutes: z.number().describe("Session duration in minutes"),
  description: z.string().describe("Brief description of the session"),
  intensity: z.enum(["easy", "moderate", "hard", "race"]).describe("Session intensity level"),
  details: z.array(z.string()).describe("Detailed breakdown: intervals, distances, exercises, etc."),
});

const trainingWeekSchema = z.object({
  week_number: z.number().describe("Week number starting from 1"),
  phase: z.string().describe("Training phase name (e.g. Base Building, Build, Peak, Taper)"),
  focus: z.string().describe("Brief focus for this week"),
  sessions: z.array(trainingSessionSchema).describe("Training sessions for this week"),
});

const phaseSchema = z.object({
  name: z.string().describe("Phase name"),
  weeks: z.string().describe("Week range (e.g. 'Weeks 1-4')"),
  description: z.string().describe("What this phase focuses on"),
});

export const trainingPlanOutputSchema = z.object({
  plan_name: z.string().describe("Name of the training plan"),
  event_type: z.string().describe("Type of event"),
  event_date: z.string().describe("Event date"),
  total_weeks: z.number().describe("Total number of weeks in the plan"),
  overview: z.string().describe("High-level overview of the training plan approach"),
  phases: z.array(phaseSchema).describe("Training phases breakdown"),
  weeks: z.array(trainingWeekSchema).describe("Detailed week-by-week plan"),
  race_day_tips: z.array(z.string()).describe("3-5 race day / event day tips"),
  notes: z.array(z.string()).describe("2-4 important notes about the plan"),
});

export type TrainingPlanOutputType = z.infer<typeof trainingPlanOutputSchema>;
