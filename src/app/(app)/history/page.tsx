"use client";

import { useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Workout } from "@/types/workout";
import { WorkoutStream } from "@/components/workout/workout-stream";
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
        <h1 className="text-2xl font-bold">Workout History</h1>
        <p className="text-muted-foreground">
          Your generated workouts ({workouts.length} total)
        </p>
      </div>

      {workouts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No workouts generated yet. Head to Generate to create your first workout.
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
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {workout.style.charAt(0).toUpperCase() + workout.style.slice(1)} — {workout.duration_min}min
                    </CardTitle>
                    <Badge variant="outline">RPE {workout.target_rpe}</Badge>
                    {workout.body_groups.map((g) => (
                      <Badge key={g} variant="secondary">
                        {g.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
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
                  <WorkoutStream
                    content={workout.content}
                    isStreaming={false}
                    error={null}
                  />
                  <div className="flex items-center justify-between">
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
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
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
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
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
