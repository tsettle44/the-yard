"use client";

import { useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Workout } from "@/types/workout";
import { WorkoutView } from "@/components/workout/workout-view";
import { WorkoutStream } from "@/components/workout/workout-stream";
import type { WorkoutOutput } from "@/lib/ai/schemas";
import { Trash2, ChevronDown, ChevronUp, Star } from "lucide-react";

export default function HistoryPage() {
  const [workouts, setWorkouts] = useLocalStorage<Workout[]>(
    "the-yard-workout-history",
    []
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleDelete(id: string) {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }

  function handleRate(id: string, rating: number) {
    setWorkouts((prev) =>
      prev.map((w) => (w.id === id ? { ...w, rating } : w))
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-black text-sm uppercase tracking-[0.2em]">History</h1>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1 font-mono">
          {workouts.length} workouts
        </p>
      </div>

      {workouts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No workouts generated yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workouts.map((workout) => (
            <Card key={workout.id}>
              <CardHeader
                className="pb-2 cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === workout.id ? null : workout.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-xs uppercase tracking-[0.15em]">
                      {workout.style} — {workout.duration_min}min
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5">
                      RPE {workout.target_rpe}
                    </span>
                    {workout.body_groups.map((g) => (
                      <span key={g} className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hidden sm:inline">
                        {g.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(workout.created_at).toLocaleDateString()}
                    </span>
                    {expandedId === workout.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </CardHeader>
              {expandedId === workout.id && (
                <CardContent className="space-y-3">
                  {workout.structured ? (
                    <WorkoutView
                      workout={workout.structured as WorkoutOutput}
                      isStreaming={false}
                      error={null}
                      onBack={() => setExpandedId(null)}
                    />
                  ) : (
                    <WorkoutStream
                      content={workout.content}
                      isStreaming={false}
                      error={null}
                    />
                  )}
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRate(workout.id, star)}
                          className="p-1"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              workout.rating && star <= workout.rating
                                ? "fill-foreground text-foreground"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(workout.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
