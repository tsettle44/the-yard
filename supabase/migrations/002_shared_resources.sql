-- Add quantity to equipment (default 1)
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

-- Add layout_notes to gyms
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS layout_notes TEXT DEFAULT '';

-- Shared resource groups
CREATE TABLE IF NOT EXISTS shared_resource_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL,
  equipment_ids UUID[] NOT NULL DEFAULT '{}',
  constraint_type TEXT NOT NULL CHECK (constraint_type IN ('no_superset', 'group_together', 'needs_setup_change', 'never_together')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for shared_resource_groups
ALTER TABLE shared_resource_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY shared_resource_groups_select ON shared_resource_groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM gyms WHERE gyms.id = shared_resource_groups.gym_id AND (gyms.user_id = auth.uid() OR gyms.user_id IS NULL))
);
CREATE POLICY shared_resource_groups_insert ON shared_resource_groups FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM gyms WHERE gyms.id = shared_resource_groups.gym_id AND (gyms.user_id = auth.uid() OR gyms.user_id IS NULL))
);
CREATE POLICY shared_resource_groups_update ON shared_resource_groups FOR UPDATE USING (
  EXISTS (SELECT 1 FROM gyms WHERE gyms.id = shared_resource_groups.gym_id AND (gyms.user_id = auth.uid() OR gyms.user_id IS NULL))
);
CREATE POLICY shared_resource_groups_delete ON shared_resource_groups FOR DELETE USING (
  EXISTS (SELECT 1 FROM gyms WHERE gyms.id = shared_resource_groups.gym_id AND (gyms.user_id = auth.uid() OR gyms.user_id IS NULL))
);

-- Make workouts.profile_id nullable for guest mode
ALTER TABLE workouts ALTER COLUMN profile_id DROP NOT NULL;
