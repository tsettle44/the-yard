"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { programTemplates, getTemplateBySlug } from "@/lib/ai/program-templates";
import { ProgramTemplate, GenerateProgramRequest } from "@/types/program";
import { BodyGroup } from "@/types/workout";
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

const weekOptions = [2, 3, 4, 6, 8];
const daysPerWeekOptions = [2, 3, 4, 5, 6];

interface ProgramFormProps {
  profileId: string | null;
  gymId: string | null;
  guestMode?: boolean;
  onGenerate: (request: GenerateProgramRequest) => void;
  isStreaming: boolean;
}

export function ProgramForm({ profileId, gymId, guestMode, onGenerate, isStreaming }: ProgramFormProps) {
  const [template, setTemplate] = useState<ProgramTemplate>("full_body");
  const [totalWeeks, setTotalWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [rpe, setRpe] = useState(7);
  const [selectedGroups, setSelectedGroups] = useState<BodyGroup[]>(["full_body"]);
  const [supersets, setSupersets] = useState(false);
  const [circuits, setCircuits] = useState(false);
  const [dropsets, setDropsets] = useState(false);
  const [notes, setNotes] = useState("");

  function selectTemplate(slug: ProgramTemplate) {
    setTemplate(slug);
    const def = getTemplateBySlug(slug);
    if (def) {
      setTotalWeeks(def.defaultWeeks);
      setDaysPerWeek(def.defaultDaysPerWeek);
      setRpe(def.defaultRpe);
    }
  }

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
      template,
      total_weeks: totalWeeks,
      days_per_week: daysPerWeek,
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
          <CardTitle>Create Program</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {guestMode && (
            <div className="p-3 border border-border text-sm text-muted-foreground">
              Generating as guest — program won&apos;t be personalized to a profile.
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
            <Label>Program Template</Label>
            <div className="flex flex-wrap gap-2">
              {programTemplates.map((t) => (
                <Button
                  key={t.slug}
                  type="button"
                  size="sm"
                  variant={template === t.slug ? "default" : "outline"}
                  onClick={() => selectTemplate(t.slug)}
                >
                  {t.name}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {getTemplateBySlug(template)?.description}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Duration (weeks)</Label>
            <div className="flex flex-wrap gap-2">
              {weekOptions.map((w) => (
                <Button
                  key={w}
                  type="button"
                  size="sm"
                  variant={totalWeeks === w ? "default" : "outline"}
                  onClick={() => setTotalWeeks(w)}
                  className="min-w-[3rem]"
                >
                  {w}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Training Days per Week</Label>
            <div className="flex flex-wrap gap-2">
              {daysPerWeekOptions.map((d) => (
                <Button
                  key={d}
                  type="button"
                  size="sm"
                  variant={daysPerWeek === d ? "default" : "outline"}
                  onClick={() => setDaysPerWeek(d)}
                  className="min-w-[2.5rem]"
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target RPE</Label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  variant={rpe === r ? "default" : "outline"}
                  onClick={() => setRpe(r)}
                  className="min-w-[2.5rem]"
                >
                  {r}
                </Button>
              ))}
            </div>
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
              placeholder="Any specific requests for the program..."
              rows={2}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={!canGenerate} className="w-full">
            {isStreaming ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Program...</>
            ) : (
              "Generate Program"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
