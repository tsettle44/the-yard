"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./use-local-storage";
import { Gym, Equipment, EquipmentConflict, EquipmentInsert, EquipmentConflictInsert } from "@/types/gym";

function generateId() {
  return crypto.randomUUID();
}

export function useGym() {
  const [gyms, setGyms, hydrated] = useLocalStorage<Gym[]>("the-yard-gyms", []);
  const [activeGymId, setActiveGymId] = useLocalStorage<string | null>(
    "the-yard-active-gym",
    null
  );

  const activeGym = gyms.find((g) => g.id === activeGymId) || gyms[0] || null;

  const createGym = useCallback(
    (name: string) => {
      const now = new Date().toISOString();
      const gym: Gym = {
        id: generateId(),
        user_id: null,
        name,
        created_at: now,
        updated_at: now,
        equipment: [],
        conflicts: [],
      };
      setGyms((prev) => [...prev, gym]);
      setActiveGymId(gym.id);
      return gym;
    },
    [setGyms, setActiveGymId]
  );

  const updateGymName = useCallback(
    (id: string, name: string) => {
      setGyms((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, name, updated_at: new Date().toISOString() } : g
        )
      );
    },
    [setGyms]
  );

  const deleteGym = useCallback(
    (id: string) => {
      setGyms((prev) => prev.filter((g) => g.id !== id));
      if (activeGymId === id) setActiveGymId(null);
    },
    [setGyms, activeGymId, setActiveGymId]
  );

  const addEquipment = useCallback(
    (gymId: string, data: Omit<EquipmentInsert, "gym_id">) => {
      const equipment: Equipment = { id: generateId(), gym_id: gymId, ...data };
      setGyms((prev) =>
        prev.map((g) =>
          g.id === gymId
            ? { ...g, equipment: [...(g.equipment || []), equipment], updated_at: new Date().toISOString() }
            : g
        )
      );
      return equipment;
    },
    [setGyms]
  );

  const removeEquipment = useCallback(
    (gymId: string, equipmentId: string) => {
      setGyms((prev) =>
        prev.map((g) =>
          g.id === gymId
            ? {
                ...g,
                equipment: (g.equipment || []).filter((e) => e.id !== equipmentId),
                conflicts: (g.conflicts || []).filter(
                  (c) => c.equipment_a !== equipmentId && c.equipment_b !== equipmentId
                ),
                updated_at: new Date().toISOString(),
              }
            : g
        )
      );
    },
    [setGyms]
  );

  const addConflict = useCallback(
    (gymId: string, data: Omit<EquipmentConflictInsert, "gym_id">) => {
      const [a, b] = [data.equipment_a, data.equipment_b].sort();
      const conflict: EquipmentConflict = {
        id: generateId(),
        gym_id: gymId,
        equipment_a: a,
        equipment_b: b,
        reason: data.reason,
      };
      setGyms((prev) =>
        prev.map((g) => {
          if (g.id !== gymId) return g;
          const exists = (g.conflicts || []).some(
            (c) => c.equipment_a === a && c.equipment_b === b
          );
          if (exists) return g;
          return { ...g, conflicts: [...(g.conflicts || []), conflict], updated_at: new Date().toISOString() };
        })
      );
      return conflict;
    },
    [setGyms]
  );

  const removeConflict = useCallback(
    (gymId: string, conflictId: string) => {
      setGyms((prev) =>
        prev.map((g) =>
          g.id === gymId
            ? {
                ...g,
                conflicts: (g.conflicts || []).filter((c) => c.id !== conflictId),
                updated_at: new Date().toISOString(),
              }
            : g
        )
      );
    },
    [setGyms]
  );

  return {
    gyms,
    activeGym,
    activeGymId,
    setActiveGymId,
    createGym,
    updateGymName,
    deleteGym,
    addEquipment,
    removeEquipment,
    addConflict,
    removeConflict,
    hydrated,
  };
}
