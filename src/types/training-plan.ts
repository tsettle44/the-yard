export type EventType =
  | "marathon"
  | "half_marathon"
  | "10k"
  | "5k"
  | "hyrox"
  | "spartan_race"
  | "triathlon"
  | "century_ride"
  | "crossfit_competition"
  | "powerlifting_meet"
  | "general_fitness"
  | "custom";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "elite";

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface TrainingPlanRequest {
  event_type: EventType;
  event_name: string;
  event_date: string; // ISO date
  experience_level: ExperienceLevel;
  available_days: DayOfWeek[];
  hours_per_day: number;
  goals: string;
  current_fitness: string;
  injuries_limitations: string;
  additional_notes: string;
}

export interface TrainingSession {
  date: string; // ISO date
  day_of_week: string;
  title: string;
  type: string; // e.g. "run", "strength", "rest", "cross-training", "race"
  duration_minutes: number;
  description: string;
  intensity: "easy" | "moderate" | "hard" | "race";
  details: string[];
}

export interface TrainingWeek {
  week_number: number;
  phase: string; // e.g. "Base Building", "Build", "Peak", "Taper"
  focus: string;
  sessions: TrainingSession[];
}

export interface TrainingPlanOutput {
  plan_name: string;
  event_type: string;
  event_date: string;
  total_weeks: number;
  overview: string;
  phases: { name: string; weeks: string; description: string }[];
  weeks: TrainingWeek[];
  race_day_tips: string[];
  notes: string[];
}

export interface TrainingPlan {
  id: string;
  request: TrainingPlanRequest;
  plan: TrainingPlanOutput | null;
  created_at: string;
}
