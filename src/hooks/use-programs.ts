"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "./use-local-storage";
import { Program } from "@/types/program";
import { config } from "@/lib/config";

const isHosted = config.isHosted;

export function usePrograms() {
  const [programs, setPrograms, hydrated] = useLocalStorage<Program[]>(
    "the-yard-programs",
    []
  );
  const [loading, setLoading] = useState(isHosted);

  useEffect(() => {
    if (!isHosted) return;
    async function fetchPrograms() {
      try {
        const res = await fetch("/api/programs");
        if (res.ok) {
          const data = await res.json();
          setPrograms(data);
        }
      } catch (error) {
        console.error("Failed to fetch programs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPrograms();
  }, [setPrograms]);

  const addProgram = useCallback(
    (program: Program) => {
      setPrograms((prev) => [program, ...prev]);

      if (isHosted) {
        fetch("/api/programs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(program),
        })
          .then((res) => res.json())
          .then((serverProgram) => {
            setPrograms((prev) =>
              prev.map((p) => (p.id === program.id ? { ...serverProgram } : p))
            );
          })
          .catch((err) => console.error("Failed to save program:", err));
      }
    },
    [setPrograms]
  );

  const deleteProgram = useCallback(
    (id: string) => {
      setPrograms((prev) => prev.filter((p) => p.id !== id));

      if (isHosted) {
        fetch(`/api/programs/${id}`, { method: "DELETE" }).catch((err) =>
          console.error("Failed to delete program:", err)
        );
      }
    },
    [setPrograms]
  );

  const updateProgram = useCallback(
    (id: string, updates: Partial<Pick<Program, "current_week" | "current_day" | "status" | "rating" | "notes">>) => {
      setPrograms((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );

      if (isHosted) {
        fetch(`/api/programs/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }).catch((err) => console.error("Failed to update program:", err));
      }
    },
    [setPrograms]
  );

  return {
    programs,
    addProgram,
    deleteProgram,
    updateProgram,
    hydrated,
    loading,
  };
}
