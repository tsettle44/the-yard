import { WorkoutStyle, BodyGroup, WorkoutParameters } from "./workout";

export type ProgramTemplate =
  | "ppl"
  | "upper_lower"
  | "full_body"
  | "strength_builder"
  | "custom";

export interface ProgramDay {
  day_number: number;
  name: string;
  focus: string;
  body_groups: BodyGroup[];
  style: WorkoutStyle;
  duration_min: number;
  target_rpe: number;
  key_lifts: string[];
  notes: string;
}

export interface ProgramWeek {
  week_number: number;
  theme: string;
  intensity_modifier: string;
  days: ProgramDay[];
}

export interface ProgramOutline {
  name: string;
  description: string;
  progression_strategy: string;
  weeks: ProgramWeek[];
  coaching: string[];
}

export interface Program {
  id: string;
  profile_id: string | null;
  gym_id: string;
  template: ProgramTemplate;
  name: string;
  total_weeks: number;
  days_per_week: number;
  outline: ProgramOutline;
  current_week: number;
  current_day: number;
  status: "active" | "completed" | "paused";
  parameters: WorkoutParameters;
  model_used: string;
  bodyweight: boolean;
  rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgramWorkout {
  id: string;
  program_id: string;
  week_number: number;
  day_number: number;
  workout_id: string;
  created_at: string;
}

export interface GenerateProgramRequest {
  profile_id: string | null;
  gym_id: string | null;
  template: ProgramTemplate;
  total_weeks: number;
  days_per_week: number;
  target_rpe: number;
  body_groups: BodyGroup[];
  parameters: WorkoutParameters;
  bodyweight?: boolean;
}
