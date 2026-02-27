"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { workoutStyles, getStyleBySlug } from "@/lib/ai/styles";
import { WorkoutStyle, BodyGroup, GenerateWorkoutRequest } from "@/types/workout";
import { Loader2 } from "lucide-react";

const bodyGroups: { value: BodyGroup; label: string }[] = [
  { value: "full_body", label: "Full Body" },
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "arms", label: "Arms" },
  { value: "core", label: "Core" },
  { value: "legs", label: "Legs" },
  { value: "glutes", label: "Glutes" },
];

interface WorkoutFormProps {
  profileId: string | null;
  gymId: string | null;
  guestMode?: boolean;
  onGenerate: (request: GenerateWorkoutRequest) => void;
  isStreaming: boolean;
}

export function WorkoutForm({ profileId, gymId, guestMode, onGenerate, isStreaming }: WorkoutFormProps) {
  const [style, setStyle] = useState<WorkoutStyle>("strength");
  const [duration, setDuration] = useState(45);
  const [rpe, setRpe] = useState(7);
  const [selectedGroups, setSelectedGroups] = useState<BodyGroup[]>(["full_body"]);
  const [supersets, setSupersets] = useState(false);
  const [circuits, setCircuits] = useState(false);
  const [dropsets, setDropsets] = useState(false);
  const [notes, setNotes] = useState("");

  function toggleGroup(group: BodyGroup) {
    setSelectedGroups((prev) => {
      if (group === "full_body") return ["full_body"];
      const without = prev.filter((g) => g !== "full_body");
      if (prev.includes(group)) {
        const result = without.filter((g) => g !== group);
        return result.length === 0 ? ["full_body"] : result;
      }
      return [...without, group];
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gymId) return;
    if (!guestMode && !profileId) return;
    onGenerate({
      profile_id: guestMode ? null : profileId,
      gym_id: gymId,
      style,
      duration_min: duration,
      target_rpe: rpe,
      body_groups: selectedGroups,
      parameters: {
        supersets: supersets || undefined,
        circuits: circuits || undefined,
        dropsets: dropsets || undefined,
        notes: notes || undefined,
      },
    });
  }

  const canGenerate = (profileId || guestMode) && gymId && !isStreaming;

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Generate Workout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {guestMode && (
            <div className="p-3 border border-border text-sm text-muted-foreground">
              Generating as guest — workout won&apos;t be personalized to a profile.
            </div>
          )}
          {!guestMode && !profileId && (
            <div className="p-3 border border-border text-sm text-muted-foreground">
              Please create and select a profile first.
            </div>
          )}
          {!gymId && (
            <div className="p-3 border border-border text-sm text-muted-foreground">
              Please create and configure a gym first.
            </div>
          )}

          <div className="space-y-2">
            <Label>Style</Label>
            <Select value={style} onValueChange={(v) => {
              const newStyle = v as WorkoutStyle;
              setStyle(newStyle);
              const def = getStyleBySlug(newStyle);
              if (def) {
                setDuration(def.defaultDuration);
                setRpe(def.defaultRpe);
              }
            }}>
              <SelectTrigger>
                <SelectValue>
                  {getStyleBySlug(style)?.name ?? style}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {workoutStyles.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>
                    {s.name} — {s.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Duration: <span className="font-mono">{duration}</span> min
            </Label>
            <Slider
              value={[duration]}
              onValueChange={([v]) => setDuration(v)}
              min={10}
              max={120}
              step={5}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Target RPE: <span className="font-mono">{rpe}</span>/10
            </Label>
            <Slider
              value={[rpe]}
              onValueChange={([v]) => setRpe(v)}
              min={1}
              max={10}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label>Body Groups</Label>
            <div className="flex flex-wrap gap-2">
              {bodyGroups.map((group) => (
                <Button
                  key={group.value}
                  type="button"
                  size="sm"
                  variant={selectedGroups.includes(group.value) ? "default" : "outline"}
                  onClick={() => toggleGroup(group.value)}
                >
                  {group.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Options</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={supersets} onCheckedChange={(c) => setSupersets(c === true)} />
                Supersets
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={circuits} onCheckedChange={(c) => setCircuits(c === true)} />
                Circuits
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={dropsets} onCheckedChange={(c) => setDropsets(c === true)} />
                Drop Sets
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Instructions</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific requests..."
              rows={2}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={!canGenerate} className="w-full">
            {isStreaming ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              "Generate Workout"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
