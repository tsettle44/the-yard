export type WorkoutStyle = "strength" | "hiit" | "circuit" | "emom" | "amrap" | "tabata" | "custom";

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
}

export interface WorkoutStructured {
  warmup?: object[];
  blocks?: object[];
  cooldown?: object[];
}

export interface Workout {
  id: string;
  profile_id: string;
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
  profile_id: string;
  gym_id: string;
  style: WorkoutStyle;
  duration_min: number;
  target_rpe: number;
  body_groups: BodyGroup[];
  parameters: WorkoutParameters;
}
