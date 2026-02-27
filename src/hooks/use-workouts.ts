"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "./use-local-storage";
import { Workout } from "@/types/workout";
import { config } from "@/lib/config";

const isHosted = config.isHosted;

export function useWorkouts() {
  const [workouts, setWorkouts, hydrated] = useLocalStorage<Workout[]>(
    "the-yard-workout-history",
    []
  );
  const [loading, setLoading] = useState(isHosted);

  // In hosted mode, fetch workouts from API on mount
  useEffect(() => {
    if (!isHosted) return;
    async function fetchWorkouts() {
      try {
        const res = await fetch("/api/workouts");
        if (res.ok) {
          const data = await res.json();
          setWorkouts(data);
        }
      } catch (error) {
        console.error("Failed to fetch workouts:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchWorkouts();
  }, [setWorkouts]);

  const addWorkout = useCallback(
    (workout: Workout) => {
      setWorkouts((prev) => [workout, ...prev]);

      if (isHosted) {
        fetch("/api/workouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(workout),
        })
          .then((res) => res.json())
          .then((serverWorkout) => {
            setWorkouts((prev) =>
              prev.map((w) => (w.id === workout.id ? { ...serverWorkout } : w))
            );
          })
          .catch((err) => console.error("Failed to save workout:", err));
      }
    },
    [setWorkouts]
  );

  const deleteWorkout = useCallback(
    (id: string) => {
      setWorkouts((prev) => prev.filter((w) => w.id !== id));

      if (isHosted) {
        fetch(`/api/workouts/${id}`, { method: "DELETE" }).catch((err) =>
          console.error("Failed to delete workout:", err)
        );
      }
    },
    [setWorkouts]
  );

  const rateWorkout = useCallback(
    (id: string, rating: number) => {
      setWorkouts((prev) =>
        prev.map((w) => (w.id === id ? { ...w, rating } : w))
      );

      if (isHosted) {
        fetch(`/api/workouts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating }),
        }).catch((err) => console.error("Failed to rate workout:", err));
      }
    },
    [setWorkouts]
  );

  return {
    workouts,
    addWorkout,
    deleteWorkout,
    rateWorkout,
    hydrated,
    loading,
  };
}
