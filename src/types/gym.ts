export type EquipmentCategory = "strength" | "cardio" | "bodyweight" | "accessory";

export interface EquipmentAttributes {
  weight?: number;
  adjustable?: boolean;
  resistance_levels?: number;
  notes?: string;
}

export interface Equipment {
  id: string;
  gym_id: string;
  slug: string;
  name: string;
  category: EquipmentCategory;
  attributes: EquipmentAttributes;
  quantity: number;
}

export type ResourceConstraint = "no_superset" | "group_together" | "needs_setup_change" | "never_together";

export interface SharedResourceGroup {
  id: string;
  gym_id: string;
  resource_name: string;
  equipment_ids: string[];
  constraint: ResourceConstraint;
  notes?: string;
}

// Kept for migration compatibility
export interface EquipmentConflict {
  id: string;
  gym_id: string;
  equipment_a: string;
  equipment_b: string;
  reason: string;
}

export interface Gym {
  id: string;
  user_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
  equipment?: Equipment[];
  conflicts?: EquipmentConflict[];
  shared_resources?: SharedResourceGroup[];
  layout_notes?: string;
}

export type GymInsert = Omit<Gym, "id" | "created_at" | "updated_at" | "equipment" | "conflicts" | "shared_resources">;
export type EquipmentInsert = Omit<Equipment, "id">;
export type EquipmentConflictInsert = Omit<EquipmentConflict, "id">;
export type SharedResourceGroupInsert = Omit<SharedResourceGroup, "id">;
