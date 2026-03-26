"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import {
  EventType,
  ExperienceLevel,
  DayOfWeek,
  TrainingPlanRequest,
} from "@/types/training-plan";

const eventTypes: { value: EventType; label: string }[] = [
  { value: "marathon", label: "Marathon" },
  { value: "half_marathon", label: "Half Marathon" },
  { value: "10k", label: "10K" },
  { value: "5k", label: "5K" },
  { value: "hyrox", label: "Hyrox" },
  { value: "spartan_race", label: "Spartan Race" },
  { value: "triathlon", label: "Triathlon" },
  { value: "century_ride", label: "Century Ride" },
  { value: "crossfit_competition", label: "CrossFit Competition" },
  { value: "powerlifting_meet", label: "Powerlifting Meet" },
  { value: "general_fitness", label: "General Fitness" },
  { value: "custom", label: "Custom Event" },
];

const experienceLevels: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: "beginner", label: "Beginner", description: "New to this type of event" },
  { value: "intermediate", label: "Intermediate", description: "Have completed 1-3 events" },
  { value: "advanced", label: "Advanced", description: "Experienced with specific goals" },
  { value: "elite", label: "Elite", description: "Competitive athlete" },
];

const daysOfWeek: { value: DayOfWeek; label: string; short: string }[] = [
  { value: "monday", label: "Monday", short: "Mon" },
  { value: "tuesday", label: "Tuesday", short: "Tue" },
  { value: "wednesday", label: "Wednesday", short: "Wed" },
  { value: "thursday", label: "Thursday", short: "Thu" },
  { value: "friday", label: "Friday", short: "Fri" },
  { value: "saturday", label: "Saturday", short: "Sat" },
  { value: "sunday", label: "Sunday", short: "Sun" },
];

const hourOptions = [0.5, 1, 1.5, 2, 2.5, 3, 4];

interface TrainingPlanFormProps {
  onGenerate: (request: TrainingPlanRequest) => void;
  isStreaming: boolean;
}

export function TrainingPlanForm({ onGenerate, isStreaming }: TrainingPlanFormProps) {
  const [step, setStep] = useState(0);
  const [eventType, setEventType] = useState<EventType>("marathon");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("intermediate");
  const [availableDays, setAvailableDays] = useState<DayOfWeek[]>(["monday", "wednesday", "friday", "saturday"]);
  const [hoursPerDay, setHoursPerDay] = useState(1);
  const [goals, setGoals] = useState("");
  const [currentFitness, setCurrentFitness] = useState("");
  const [injuriesLimitations, setInjuriesLimitations] = useState("");
  const [equipmentAvailable, setEquipmentAvailable] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const totalSteps = 4;

  function toggleDay(day: DayOfWeek) {
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return !!eventType && !!eventName && !!eventDate;
      case 1:
        return !!experienceLevel;
      case 2:
        return availableDays.length > 0 && hoursPerDay > 0;
      case 3:
        return true;
      default:
        return false;
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < totalSteps - 1) {
      setStep(step + 1);
      return;
    }
    onGenerate({
      event_type: eventType,
      event_name: eventName,
      event_date: eventDate,
      experience_level: experienceLevel,
      available_days: availableDays,
      hours_per_day: hoursPerDay,
      goals,
      current_fitness: currentFitness,
      injuries_limitations: injuriesLimitations,
      equipment_available: equipmentAvailable,
      additional_notes: additionalNotes,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create Training Plan</CardTitle>
            <span className="text-xs text-muted-foreground font-mono">
              {step + 1} / {totalSteps}
            </span>
          </div>
          <div className="flex gap-1 mt-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-foreground" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Event Type</Label>
                <div className="flex flex-wrap gap-2">
                  {eventTypes.map((et) => (
                    <Button
                      key={et.value}
                      type="button"
                      size="sm"
                      variant={eventType === et.value ? "default" : "outline"}
                      onClick={() => setEventType(et.value)}
                    >
                      {et.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-name">Event Name</Label>
                <Input
                  id="event-name"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Chicago Marathon 2026"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-date">Event Date</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Experience Level</Label>
                <div className="grid gap-2">
                  {experienceLevels.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      className={`text-left p-3 border transition-colors ${
                        experienceLevel === level.value
                          ? "border-foreground bg-foreground/5"
                          : "border-border hover:border-foreground/30"
                      }`}
                      onClick={() => setExperienceLevel(level.value)}
                    >
                      <div className="font-medium text-sm">{level.label}</div>
                      <div className="text-xs text-muted-foreground">{level.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-fitness">Current Fitness Level</Label>
                <Textarea
                  id="current-fitness"
                  value={currentFitness}
                  onChange={(e) => setCurrentFitness(e.target.value)}
                  placeholder="e.g. Currently running 20 miles/week, can run 5K in 25 min"
                  rows={2}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Available Training Days</Label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      size="sm"
                      variant={availableDays.includes(day.value) ? "default" : "outline"}
                      onClick={() => toggleDay(day.value)}
                      className="min-w-[3.5rem]"
                    >
                      {day.short}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {availableDays.length} day{availableDays.length !== 1 ? "s" : ""} selected
                </p>
              </div>

              <div className="space-y-2">
                <Label>Time Available Per Session (hours)</Label>
                <div className="flex flex-wrap gap-2">
                  {hourOptions.map((h) => (
                    <Button
                      key={h}
                      type="button"
                      size="sm"
                      variant={hoursPerDay === h ? "default" : "outline"}
                      onClick={() => setHoursPerDay(h)}
                      className="min-w-[3rem]"
                    >
                      {h}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="goals">Goals</Label>
                <Textarea
                  id="goals"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="e.g. Finish under 4 hours, run the whole way"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="injuries">Injuries or Limitations</Label>
                <Textarea
                  id="injuries"
                  value={injuriesLimitations}
                  onChange={(e) => setInjuriesLimitations(e.target.value)}
                  placeholder="e.g. Previous knee injury, avoid high impact on consecutive days"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment">Equipment Available</Label>
                <Textarea
                  id="equipment"
                  value={equipmentAvailable}
                  onChange={(e) => setEquipmentAvailable(e.target.value)}
                  placeholder="e.g. Home gym with dumbbells, treadmill, access to a pool"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional-notes">Additional Notes</Label>
                <Textarea
                  id="additional-notes"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Anything else we should know..."
                  rows={2}
                />
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={isStreaming}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          )}

          <Button
            type="submit"
            disabled={!canAdvance() || isStreaming}
            className="flex-1"
          >
            {isStreaming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Plan...
              </>
            ) : step < totalSteps - 1 ? (
              <>
                Next
                <ArrowRight className="ml-1 h-4 w-4" />
              </>
            ) : (
              "Generate Training Plan"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
