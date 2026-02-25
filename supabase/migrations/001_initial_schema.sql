-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fitness_level TEXT NOT NULL CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  preferred_styles TEXT[] DEFAULT '{}',
  goals TEXT DEFAULT '',
  preferences JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Gyms
CREATE TABLE gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Equipment
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'bodyweight', 'accessory')),
  attributes JSONB DEFAULT '{}',
  UNIQUE (gym_id, slug)
);

-- Equipment conflicts
CREATE TABLE equipment_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  equipment_a UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  equipment_b UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  reason TEXT DEFAULT '',
  CHECK (equipment_a < equipment_b),
  UNIQUE (equipment_a, equipment_b)
);

-- Workouts
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  style TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  target_rpe INTEGER NOT NULL CHECK (target_rpe BETWEEN 1 AND 10),
  body_groups TEXT[] DEFAULT '{}',
  parameters JSONB DEFAULT '{}',
  content TEXT DEFAULT '',
  structured JSONB,
  model_used TEXT DEFAULT '',
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  rating INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payments (hosted mode)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Entitlements (hosted mode)
CREATE TABLE entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'paid')),
  free_generations_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

-- Profiles: users can manage their own or null user_id rows
CREATE POLICY profiles_select ON profiles FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY profiles_delete ON profiles FOR DELETE USING (user_id = auth.uid() OR user_id IS NULL);

-- Gyms
CREATE POLICY gyms_select ON gyms FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY gyms_insert ON gyms FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY gyms_update ON gyms FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY gyms_delete ON gyms FOR DELETE USING (user_id = auth.uid() OR user_id IS NULL);

-- Equipment: access via gym ownership
CREATE POLICY equipment_select ON equipment FOR SELECT USING (
  EXISTS (SELECT 1 FROM gyms WHERE gyms.id = equipment.gym_id AND (gyms.user_id = auth.uid() OR gyms.user_id IS NULL))
);
CREATE POLICY equipment_insert ON equipment FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM gyms WHERE gyms.id = equipment.gym_id AND (gyms.user_id = auth.uid() OR gyms.user_id IS NULL))
);
CREATE POLICY equipment_update ON equipment FOR UPDATE USING (
  EXISTS (SELECT 1 FROM gyms WHERE gyms.id = equipment.gym_id AND (gyms.user_id = auth.uid() OR gyms.user_id IS NULL))
);
CREATE POLICY equipment_delete ON equipment FOR DELETE USING (
  EXISTS (SELECT 1 FROM gyms WHERE gyms.id = equipment.gym_id AND (gyms.user_id = auth.uid() OR gyms.user_id IS NULL))
);

-- Equipment conflicts: access via gym ownership
CREATE POLICY equipment_conflicts_select ON equipment_conflicts FOR SELECT USING (
  EXISTS (SELECT 1 FROM gyms WHERE gyms.id = equipment_conflicts.gym_id AND (gyms.user_id = auth.uid() OR gyms.user_id IS NULL))
);
CREATE POLICY equipment_conflicts_insert ON equipment_conflicts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM gyms WHERE gyms.id = equipment_conflicts.gym_id AND (gyms.user_id = auth.uid() OR gyms.user_id IS NULL))
);
CREATE POLICY equipment_conflicts_delete ON equipment_conflicts FOR DELETE USING (
  EXISTS (SELECT 1 FROM gyms WHERE gyms.id = equipment_conflicts.gym_id AND (gyms.user_id = auth.uid() OR gyms.user_id IS NULL))
);

-- Workouts
CREATE POLICY workouts_select ON workouts FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = workouts.profile_id AND (profiles.user_id = auth.uid() OR profiles.user_id IS NULL))
);
CREATE POLICY workouts_insert ON workouts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = workouts.profile_id AND (profiles.user_id = auth.uid() OR profiles.user_id IS NULL))
);
CREATE POLICY workouts_update ON workouts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = workouts.profile_id AND (profiles.user_id = auth.uid() OR profiles.user_id IS NULL))
);
CREATE POLICY workouts_delete ON workouts FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = workouts.profile_id AND (profiles.user_id = auth.uid() OR profiles.user_id IS NULL))
);

-- Payments & entitlements
CREATE POLICY payments_select ON payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY entitlements_select ON entitlements FOR SELECT USING (user_id = auth.uid());

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER gyms_updated_at BEFORE UPDATE ON gyms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER workouts_updated_at BEFORE UPDATE ON workouts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER entitlements_updated_at BEFORE UPDATE ON entitlements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
