import { Gym, SharedResourceGroup, EquipmentConflict } from "@/types/gym";

const SCHEMA_VERSION_KEY = "the-yard-gym-schema-version";
const CURRENT_VERSION = 2;

export function needsMigration(): boolean {
  if (typeof window === "undefined") return false;
  const version = parseInt(localStorage.getItem(SCHEMA_VERSION_KEY) || "1", 10);
  return version < CURRENT_VERSION;
}

/**
 * Cluster pairwise conflicts into shared resource groups using connected-component analysis.
 * Each connected component becomes one shared resource group with "no_superset" constraint.
 */
function clusterConflicts(
  gymId: string,
  conflicts: EquipmentConflict[],
  equipmentNames: Map<string, string>
): SharedResourceGroup[] {
  if (conflicts.length === 0) return [];

  // Build adjacency list
  const adj = new Map<string, Set<string>>();
  for (const c of conflicts) {
    if (!adj.has(c.equipment_a)) adj.set(c.equipment_a, new Set());
    if (!adj.has(c.equipment_b)) adj.set(c.equipment_b, new Set());
    adj.get(c.equipment_a)!.add(c.equipment_b);
    adj.get(c.equipment_b)!.add(c.equipment_a);
  }

  // Find connected components via BFS
  const visited = new Set<string>();
  const groups: SharedResourceGroup[] = [];

  for (const node of adj.keys()) {
    if (visited.has(node)) continue;
    const component: string[] = [];
    const queue = [node];
    visited.add(node);
    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      for (const neighbor of adj.get(current) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    // Derive a name from equipment names
    const names = component
      .map((id) => equipmentNames.get(id) || "Equipment")
      .slice(0, 3);
    const resourceName =
      names.length <= 3
        ? names.join(" + ")
        : `${names.join(" + ")} + ${component.length - 3} more`;

    groups.push({
      id: crypto.randomUUID(),
      gym_id: gymId,
      resource_name: resourceName,
      equipment_ids: component,
      constraint: "no_superset",
      notes: "Auto-migrated from equipment conflicts",
    });
  }

  return groups;
}

export function migrateGyms(gyms: Gym[]): Gym[] {
  return gyms.map((gym) => {
    const equipmentNames = new Map(
      (gym.equipment || []).map((e) => [e.id, e.name])
    );

    // Add quantity to equipment that doesn't have it
    const equipment = (gym.equipment || []).map((e) => ({
      ...e,
      quantity: e.quantity ?? 1,
    }));

    // Convert conflicts to shared resources if not already migrated
    const existingResources = gym.shared_resources || [];
    const newResources =
      existingResources.length === 0
        ? clusterConflicts(gym.id, gym.conflicts || [], equipmentNames)
        : existingResources;

    return {
      ...gym,
      equipment,
      shared_resources: newResources,
      layout_notes: gym.layout_notes || "",
    };
  });
}

export function markMigrated(): void {
  localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_VERSION));
}
