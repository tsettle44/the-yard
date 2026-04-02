-- Programs table
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  gym_id TEXT NOT NULL,
  template TEXT NOT NULL CHECK (template IN ('ppl', 'upper_lower', 'full_body', 'strength_builder', 'custom')),
  name TEXT NOT NULL,
  total_weeks INTEGER NOT NULL CHECK (total_weeks BETWEEN 1 AND 12),
  days_per_week INTEGER NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
  outline JSONB NOT NULL,
  current_week INTEGER NOT NULL DEFAULT 1,
  current_day INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  parameters JSONB DEFAULT '{}',
  model_used TEXT DEFAULT '',
  bodyweight BOOLEAN DEFAULT false,
  rating INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Program-Workout join table (links generated day workouts to program days)
CREATE TABLE program_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  day_number INTEGER NOT NULL,
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (program_id, week_number, day_number)
);

-- RLS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_workouts ENABLE ROW LEVEL SECURITY;

-- Programs: access via profile ownership
CREATE POLICY programs_select ON programs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = programs.profile_id AND (profiles.user_id = auth.uid() OR profiles.user_id IS NULL))
  OR (profile_id IS NULL)
);
CREATE POLICY programs_insert ON programs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = programs.profile_id AND (profiles.user_id = auth.uid() OR profiles.user_id IS NULL))
  OR (profile_id IS NULL)
);
CREATE POLICY programs_update ON programs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = programs.profile_id AND (profiles.user_id = auth.uid() OR profiles.user_id IS NULL))
  OR (profile_id IS NULL)
);
CREATE POLICY programs_delete ON programs FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = programs.profile_id AND (profiles.user_id = auth.uid() OR profiles.user_id IS NULL))
  OR (profile_id IS NULL)
);

-- Program workouts: access via program ownership
CREATE POLICY program_workouts_select ON program_workouts FOR SELECT USING (
  EXISTS (SELECT 1 FROM programs WHERE programs.id = program_workouts.program_id)
);
CREATE POLICY program_workouts_insert ON program_workouts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM programs WHERE programs.id = program_workouts.program_id)
);
CREATE POLICY program_workouts_delete ON program_workouts FOR DELETE USING (
  EXISTS (SELECT 1 FROM programs WHERE programs.id = program_workouts.program_id)
);

-- Updated at trigger for programs
CREATE TRIGGER programs_updated_at BEFORE UPDATE ON programs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
