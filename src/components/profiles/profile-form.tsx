"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FitnessLevel, ProfilePreferences } from "@/types/profile";
import { workoutStyles } from "@/lib/ai/styles";

interface ProfileFormProps {
  initialValues?: {
    name: string;
    fitness_level: FitnessLevel;
    preferred_styles: string[];
    goals: string;
    preferences: ProfilePreferences;
    is_default: boolean;
  };
  onSubmit: (values: {
    name: string;
    fitness_level: FitnessLevel;
    preferred_styles: string[];
    goals: string;
    preferences: ProfilePreferences;
    is_default: boolean;
  }) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function ProfileForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Save Profile",
}: ProfileFormProps) {
  const [name, setName] = useState(initialValues?.name || "");
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>(
    initialValues?.fitness_level || "intermediate"
  );
  const [preferredStyles, setPreferredStyles] = useState<string[]>(
    initialValues?.preferred_styles || []
  );
  const [goals, setGoals] = useState(initialValues?.goals || "");
  const [injuries, setInjuries] = useState(
    initialValues?.preferences?.injuries?.join(", ") || ""
  );
  const [avoidedExercises, setAvoidedExercises] = useState(
    initialValues?.preferences?.avoidedExercises?.join(", ") || ""
  );
  const [notes, setNotes] = useState(initialValues?.preferences?.notes || "");
  const [isDefault, setIsDefault] = useState(initialValues?.is_default || false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      fitness_level: fitnessLevel,
      preferred_styles: preferredStyles,
      goals,
      preferences: {
        injuries: injuries
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        avoidedExercises: avoidedExercises
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        notes: notes || undefined,
      },
      is_default: isDefault,
    });
  }

  function toggleStyle(slug: string) {
    setPreferredStyles((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{initialValues ? "Edit Profile" : "New Profile"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Warrior"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fitness_level">Fitness Level</Label>
            <Select value={fitnessLevel} onValueChange={(v) => setFitnessLevel(v as FitnessLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Preferred Styles</Label>
            <div className="flex flex-wrap gap-2">
              {workoutStyles.filter((s) => s.slug !== "custom").map((style) => (
                <Button
                  key={style.slug}
                  type="button"
                  size="sm"
                  variant={preferredStyles.includes(style.slug) ? "default" : "outline"}
                  onClick={() => toggleStyle(style.slug)}
                >
                  {style.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goals">Goals</Label>
            <Textarea
              id="goals"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g., Build strength, improve endurance"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="injuries">Injuries / Limitations</Label>
            <Input
              id="injuries"
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="Comma-separated"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avoided">Exercises to Avoid</Label>
            <Input
              id="avoided"
              value={avoidedExercises}
              onChange={(e) => setAvoidedExercises(e.target.value)}
              placeholder="Comma-separated"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else the AI should know..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
            />
            <Label htmlFor="is_default">Set as default profile</Label>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="submit">{submitLabel}</Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </CardFooter>
      </Card>
    </form>
  );
}
