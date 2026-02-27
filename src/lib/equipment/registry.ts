import { EquipmentCategory, ResourceConstraint } from "@/types/gym";

export interface EquipmentDefinition {
  slug: string;
  name: string;
  category: EquipmentCategory;
  defaultAttributes?: Record<string, unknown>;
}

export const equipmentRegistry: EquipmentDefinition[] = [
  // Strength
  { slug: "barbell", name: "Barbell", category: "strength" },
  { slug: "squat-rack", name: "Squat Rack", category: "strength" },
  { slug: "bench-press", name: "Bench Press", category: "strength" },
  { slug: "adjustable-bench", name: "Adjustable Bench", category: "strength" },
  { slug: "dumbbells", name: "Dumbbells", category: "strength", defaultAttributes: { adjustable: true } },
  { slug: "kettlebells", name: "Kettlebells", category: "strength" },
  { slug: "weight-plates", name: "Weight Plates", category: "strength" },
  { slug: "trap-bar", name: "Trap Bar", category: "strength" },
  { slug: "ez-curl-bar", name: "EZ Curl Bar", category: "strength" },
  { slug: "cable-machine", name: "Cable Machine", category: "strength" },
  { slug: "smith-machine", name: "Smith Machine", category: "strength" },
  { slug: "leg-press", name: "Leg Press", category: "strength" },
  { slug: "lat-pulldown", name: "Lat Pulldown", category: "strength" },
  { slug: "dip-station", name: "Dip Station", category: "strength" },

  // Cardio
  { slug: "treadmill", name: "Treadmill", category: "cardio" },
  { slug: "rowing-machine", name: "Rowing Machine", category: "cardio" },
  { slug: "exercise-bike", name: "Exercise Bike", category: "cardio" },
  { slug: "assault-bike", name: "Assault/Air Bike", category: "cardio" },
  { slug: "elliptical", name: "Elliptical", category: "cardio" },
  { slug: "ski-erg", name: "Ski Erg", category: "cardio" },
  { slug: "jump-rope", name: "Jump Rope", category: "cardio" },

  // Bodyweight
  { slug: "pull-up-bar", name: "Pull-Up Bar", category: "bodyweight" },
  { slug: "gymnastics-rings", name: "Gymnastics Rings", category: "bodyweight" },
  { slug: "parallettes", name: "Parallettes", category: "bodyweight" },
  { slug: "plyo-box", name: "Plyo Box", category: "bodyweight" },
  { slug: "ghd", name: "GHD Machine", category: "bodyweight" },

  // Accessories
  { slug: "resistance-bands", name: "Resistance Bands", category: "accessory" },
  { slug: "ab-wheel", name: "Ab Wheel", category: "accessory" },
  { slug: "foam-roller", name: "Foam Roller", category: "accessory" },
  { slug: "medicine-ball", name: "Medicine Ball", category: "accessory" },
  { slug: "slam-ball", name: "Slam Ball", category: "accessory" },
  { slug: "battle-ropes", name: "Battle Ropes", category: "accessory" },
  { slug: "trx-suspension", name: "TRX / Suspension Trainer", category: "accessory" },
  { slug: "landmine", name: "Landmine Attachment", category: "accessory" },
  { slug: "sandbag", name: "Sandbag", category: "accessory" },
];

export function getEquipmentByCategory(category: EquipmentCategory): EquipmentDefinition[] {
  return equipmentRegistry.filter((e) => e.category === category);
}

export function getEquipmentBySlug(slug: string): EquipmentDefinition | undefined {
  return equipmentRegistry.find((e) => e.slug === slug);
}

export interface ResourceSuggestion {
  resource_name: string;
  equipment_slugs: string[];
  constraint: ResourceConstraint;
  reason: string;
}

export const resourceSuggestions: ResourceSuggestion[] = [
  {
    resource_name: "Barbell Station",
    equipment_slugs: ["barbell", "squat-rack", "bench-press", "weight-plates"],
    constraint: "group_together",
    reason: "These all share the same barbell — group exercises together to avoid reloading",
  },
  {
    resource_name: "Cable / Lat Pulldown",
    equipment_slugs: ["cable-machine", "lat-pulldown"],
    constraint: "no_superset",
    reason: "Often the same machine or adjacent stations that share weight stacks",
  },
  {
    resource_name: "Floor Space",
    equipment_slugs: ["barbell", "trap-bar", "kettlebells", "sandbag"],
    constraint: "needs_setup_change",
    reason: "Floor-based movements need the same open area — transitions require clearing",
  },
];

/**
 * Returns suggestions that match at least 2 of the user's currently selected equipment slugs.
 */
export function getApplicableSuggestions(selectedSlugs: string[]): ResourceSuggestion[] {
  const slugSet = new Set(selectedSlugs);
  return resourceSuggestions.filter(
    (s) => s.equipment_slugs.filter((slug) => slugSet.has(slug)).length >= 2
  );
}

export const equipmentCategories: { value: EquipmentCategory; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "accessory", label: "Accessories" },
];
