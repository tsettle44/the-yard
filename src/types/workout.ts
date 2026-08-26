export type WorkoutStyle = "strength" | "hiit" | "circuit" | "emom" | "amrap" | "tabata" | "crossfit" | "hyrox" | "custom";

export type GroupWorkoutFormat = "station_rotation" | "shared";

export type BodyGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "core"
  | "legs"
  | "glutes"
  | "full_body";

export interface WorkoutParameters {
  supersets?: boolean;
  circuits?: boolean;
  dropsets?: boolean;
  notes?: string;
  participant_count?: number;
  group_format?: GroupWorkoutFormat;
}

export interface GroupWorkoutAssignment {
  participant: number;
  exercise: string;
  work: string;
  rest: string;
  equipment_ids: string[];
  note?: string;
}

export interface GroupWorkoutRound {
  name: string;
  duration: string;
  assignments: GroupWorkoutAssignment[];
}

export interface GroupWorkoutSchedule {
  participant_count: number;
  format: GroupWorkoutFormat;
  rounds: GroupWorkoutRound[];
}

export interface WorkoutStructured {
  warmup?: { name: string; detail: string }[];
  blocks?: {
    name: string;
    format: "straight" | "superset" | "circuit" | "emom" | "amrap" | "tabata";
    exercises: { name: string; sets: string; reps: string; rest: string; note?: string }[];
    note?: string;
  }[];
  cooldown?: { name: string; detail: string }[];
  coaching?: string[];
  group?: GroupWorkoutSchedule;
}

export interface Workout {
  id: string;
  profile_id: string | null;
  gym_id: string;
  style: WorkoutStyle;
  duration_min: number;
  target_rpe: number;
  body_groups: BodyGroup[];
  parameters: WorkoutParameters;
  content: string;
  structured: WorkoutStructured | null;
  model_used: string;
  prompt_tokens: number;
  completion_tokens: number;
  rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkoutInsert = Omit<Workout, "id" | "created_at" | "updated_at">;

export interface GenerateWorkoutRequest {
  profile_id: string | null;
  gym_id: string | null;
  style: WorkoutStyle;
  duration_min: number;
  target_rpe: number;
  body_groups: BodyGroup[];
  parameters: WorkoutParameters;
  bodyweight?: boolean;
  participant_count?: number;
  group_format?: GroupWorkoutFormat;
}
