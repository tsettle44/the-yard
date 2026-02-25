export type FitnessLevel = "beginner" | "intermediate" | "advanced";

export interface ProfilePreferences {
  warmupDuration?: number;
  cooldownDuration?: number;
  restBetweenSets?: number;
  avoidedExercises?: string[];
  injuries?: string[];
  notes?: string;
}

export interface Profile {
  id: string;
  user_id: string | null;
  name: string;
  fitness_level: FitnessLevel;
  preferred_styles: string[];
  goals: string;
  preferences: ProfilePreferences;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = Omit<Profile, "id" | "created_at" | "updated_at">;
export type ProfileUpdate = Partial<ProfileInsert>;
