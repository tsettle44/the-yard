"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "./use-local-storage";
import { Gym, Equipment, SharedResourceGroup, SharedResourceGroupInsert, EquipmentInsert } from "@/types/gym";
import { needsMigration, migrateGyms, markMigrated } from "@/lib/migrations/gym-v2";
import { config } from "@/lib/config";

const isHosted = config.isHosted;

function generateId() {
  return crypto.randomUUID();
}

export function useGym() {
  const [gyms, setGyms, hydrated] = useLocalStorage<Gym[]>("the-yard-gyms", []);
  const [activeGymId, setActiveGymId] = useLocalStorage<string | null>(
    "the-yard-active-gym",
    null
  );
  const migrated = useRef(false);
  const [loading, setLoading] = useState(isHosted);

  // In hosted mode, fetch gyms from API on mount
  useEffect(() => {
    if (!isHosted) return;
    async function fetchGyms() {
      try {
        const res = await fetch("/api/gyms");
        if (res.ok) {
          const data = await res.json();
          setGyms(data);
        }
      } catch (error) {
        console.error("Failed to fetch gyms:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchGyms();
  }, [setGyms]);

  // Run migration on first hydration (self-hosted only)
  useEffect(() => {
    if (isHosted || !hydrated || migrated.current) return;
    if (needsMigration() && gyms.length > 0) {
      setGyms(migrateGyms(gyms));
      markMigrated();
    } else if (gyms.length === 0) {
      markMigrated();
    }
    migrated.current = true;
  }, [hydrated, gyms, setGyms]);

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
        shared_resources: [],
        layout_notes: "",
      };
      setGyms((prev) => [...prev, gym]);
      setActiveGymId(gym.id);

      if (isHosted) {
        fetch("/api/gyms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        })
          .then((res) => res.json())
          .then((serverGym) => {
            setGyms((prev) =>
              prev.map((g) => (g.id === gym.id ? { ...serverGym } : g))
            );
            setActiveGymId(serverGym.id);
          })
          .catch((err) => console.error("Failed to save gym:", err));
      }

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

      if (isHosted) {
        fetch(`/api/gyms/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }).catch((err) => console.error("Failed to update gym name:", err));
      }
    },
    [setGyms]
  );

  const deleteGym = useCallback(
    (id: string) => {
      setGyms((prev) => prev.filter((g) => g.id !== id));
      if (activeGymId === id) setActiveGymId(null);

      if (isHosted) {
        fetch(`/api/gyms/${id}`, { method: "DELETE" }).catch((err) =>
          console.error("Failed to delete gym:", err)
        );
      }
    },
    [setGyms, activeGymId, setActiveGymId]
  );

  const addEquipment = useCallback(
    (gymId: string, data: Omit<EquipmentInsert, "gym_id" | "quantity">) => {
      const equipment: Equipment = { id: generateId(), gym_id: gymId, quantity: 1, ...data };
      setGyms((prev) =>
        prev.map((g) =>
          g.id === gymId
            ? { ...g, equipment: [...(g.equipment || []), equipment], updated_at: new Date().toISOString() }
            : g
        )
      );

      if (isHosted) {
        fetch(`/api/gyms/${gymId}/equipment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, quantity: 1 }),
        })
          .then((res) => res.json())
          .then((serverEq) => {
            setGyms((prev) =>
              prev.map((g) =>
                g.id === gymId
                  ? {
                      ...g,
                      equipment: (g.equipment || []).map((e) =>
                        e.id === equipment.id ? { ...serverEq } : e
                      ),
                    }
                  : g
              )
            );
          })
          .catch((err) => console.error("Failed to save equipment:", err));
      }

      return equipment;
    },
    [setGyms]
  );

  const removeEquipment = useCallback(
    (gymId: string, equipmentId: string) => {
      setGyms((prev) =>
        prev.map((g) => {
          if (g.id !== gymId) return g;
          return {
            ...g,
            equipment: (g.equipment || []).filter((e) => e.id !== equipmentId),
            conflicts: (g.conflicts || []).filter(
              (c) => c.equipment_a !== equipmentId && c.equipment_b !== equipmentId
            ),
            shared_resources: (g.shared_resources || []).map((sr) => ({
              ...sr,
              equipment_ids: sr.equipment_ids.filter((id) => id !== equipmentId),
            })).filter((sr) => sr.equipment_ids.length >= 2),
            updated_at: new Date().toISOString(),
          };
        })
      );

      if (isHosted) {
        fetch(`/api/gyms/${gymId}/equipment/${equipmentId}`, {
          method: "DELETE",
        }).catch((err) => console.error("Failed to delete equipment:", err));
      }
    },
    [setGyms]
  );

  const updateEquipmentQuantity = useCallback(
    (gymId: string, equipmentId: string, quantity: number) => {
      const qty = Math.max(1, quantity);
      setGyms((prev) =>
        prev.map((g) =>
          g.id === gymId
            ? {
                ...g,
                equipment: (g.equipment || []).map((e) =>
                  e.id === equipmentId ? { ...e, quantity: qty } : e
                ),
                updated_at: new Date().toISOString(),
              }
            : g
        )
      );

      if (isHosted) {
        fetch(`/api/gyms/${gymId}/equipment/${equipmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: qty }),
        }).catch((err) => console.error("Failed to update quantity:", err));
      }
    },
    [setGyms]
  );

  const addSharedResource = useCallback(
    (gymId: string, data: Omit<SharedResourceGroupInsert, "gym_id">) => {
      const resource: SharedResourceGroup = { id: generateId(), gym_id: gymId, ...data };
      setGyms((prev) =>
        prev.map((g) =>
          g.id === gymId
            ? {
                ...g,
                shared_resources: [...(g.shared_resources || []), resource],
                updated_at: new Date().toISOString(),
              }
            : g
        )
      );

      if (isHosted) {
        fetch(`/api/gyms/${gymId}/shared-resources`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
          .then((res) => res.json())
          .then((serverSr) => {
            setGyms((prev) =>
              prev.map((g) =>
                g.id === gymId
                  ? {
                      ...g,
                      shared_resources: (g.shared_resources || []).map((sr) =>
                        sr.id === resource.id ? { ...serverSr } : sr
                      ),
                    }
                  : g
              )
            );
          })
          .catch((err) => console.error("Failed to save shared resource:", err));
      }

      return resource;
    },
    [setGyms]
  );

  const updateSharedResource = useCallback(
    (gymId: string, resourceId: string, updates: Partial<Omit<SharedResourceGroup, "id" | "gym_id">>) => {
      setGyms((prev) =>
        prev.map((g) =>
          g.id === gymId
            ? {
                ...g,
                shared_resources: (g.shared_resources || []).map((sr) =>
                  sr.id === resourceId ? { ...sr, ...updates } : sr
                ),
                updated_at: new Date().toISOString(),
              }
            : g
        )
      );
    },
    [setGyms]
  );

  const removeSharedResource = useCallback(
    (gymId: string, resourceId: string) => {
      setGyms((prev) =>
        prev.map((g) =>
          g.id === gymId
            ? {
                ...g,
                shared_resources: (g.shared_resources || []).filter((sr) => sr.id !== resourceId),
                updated_at: new Date().toISOString(),
              }
            : g
        )
      );

      if (isHosted) {
        fetch(`/api/gyms/${gymId}/shared-resources/${resourceId}`, {
          method: "DELETE",
        }).catch((err) => console.error("Failed to delete shared resource:", err));
      }
    },
    [setGyms]
  );

  const updateLayoutNotes = useCallback(
    (gymId: string, notes: string) => {
      setGyms((prev) =>
        prev.map((g) =>
          g.id === gymId
            ? { ...g, layout_notes: notes, updated_at: new Date().toISOString() }
            : g
        )
      );

      if (isHosted) {
        fetch(`/api/gyms/${gymId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layout_notes: notes }),
        }).catch((err) => console.error("Failed to update layout notes:", err));
      }
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
    updateEquipmentQuantity,
    addSharedResource,
    updateSharedResource,
    removeSharedResource,
    updateLayoutNotes,
    hydrated,
    loading,
  };
}
