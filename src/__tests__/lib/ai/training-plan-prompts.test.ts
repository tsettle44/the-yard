import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTrainingPlanSystemPrompt, buildTrainingPlanUserPrompt } from "@/lib/ai/training-plan-prompts";
import { TrainingPlanRequest } from "@/types/training-plan";
import { Equipment } from "@/types/gym";

const baseRequest: TrainingPlanRequest = {
  event_type: "marathon",
  event_name: "Chicago Marathon 2026",
  event_date: "2026-10-11",
  experience_level: "intermediate",
  available_days: ["monday", "wednesday", "friday", "saturday"],
  hours_per_day: 1.5,
  goals: "Finish under 4 hours",
  current_fitness: "Running 20 miles/week",
  injuries_limitations: "Previous knee injury",
  additional_notes: "Prefer morning runs",
};

const mockEquipment: Equipment[] = [
  { id: "e1", gym_id: "g1", slug: "barbell", name: "Barbell", category: "strength", attributes: {}, quantity: 1 },
  { id: "e2", gym_id: "g1", slug: "dumbbells", name: "Dumbbells", category: "strength", attributes: {}, quantity: 2 },
  { id: "e3", gym_id: "g1", slug: "treadmill", name: "Treadmill", category: "cardio", attributes: {}, quantity: 1 },
];

describe("buildTrainingPlanSystemPrompt", () => {
  it("returns a non-empty string", () => {
    const prompt = buildTrainingPlanSystemPrompt();
    expect(prompt).toBeTruthy();
    expect(typeof prompt).toBe("string");
  });

  it("includes periodization principles", () => {
    const prompt = buildTrainingPlanSystemPrompt();
    expect(prompt).toContain("periodization");
    expect(prompt).toContain("Base");
    expect(prompt).toContain("Build");
    expect(prompt).toContain("Peak");
    expect(prompt).toContain("Taper");
  });

  it("includes volume progression rules", () => {
    const prompt = buildTrainingPlanSystemPrompt();
    expect(prompt).toContain("10%");
  });

  it("includes recovery week guidance", () => {
    const prompt = buildTrainingPlanSystemPrompt();
    expect(prompt).toContain("recovery weeks");
  });

  it("includes plan length guidelines", () => {
    const prompt = buildTrainingPlanSystemPrompt();
    expect(prompt).toContain("Marathon");
    expect(prompt).toContain("Hyrox");
    expect(prompt).toContain("Triathlon");
  });

  it("includes equipment constraint", () => {
    const prompt = buildTrainingPlanSystemPrompt();
    expect(prompt).toContain("equipment");
  });
});

describe("buildTrainingPlanUserPrompt", () => {
  it("includes event details", () => {
    const prompt = buildTrainingPlanUserPrompt({ request: baseRequest, equipment: [] });
    expect(prompt).toContain("Chicago Marathon 2026");
    expect(prompt).toContain("marathon");
    expect(prompt).toContain("2026-10-11");
  });

  it("includes experience level", () => {
    const prompt = buildTrainingPlanUserPrompt({ request: baseRequest, equipment: [] });
    expect(prompt).toContain("intermediate");
  });

  it("includes available days", () => {
    const prompt = buildTrainingPlanUserPrompt({ request: baseRequest, equipment: [] });
    expect(prompt).toContain("Monday");
    expect(prompt).toContain("Wednesday");
    expect(prompt).toContain("Friday");
    expect(prompt).toContain("Saturday");
  });

  it("includes hours per day", () => {
    const prompt = buildTrainingPlanUserPrompt({ request: baseRequest, equipment: [] });
    expect(prompt).toContain("1.5 hours");
  });

  it("includes goals", () => {
    const prompt = buildTrainingPlanUserPrompt({ request: baseRequest, equipment: [] });
    expect(prompt).toContain("Finish under 4 hours");
  });

  it("includes current fitness", () => {
    const prompt = buildTrainingPlanUserPrompt({ request: baseRequest, equipment: [] });
    expect(prompt).toContain("Running 20 miles/week");
  });

  it("includes injuries", () => {
    const prompt = buildTrainingPlanUserPrompt({ request: baseRequest, equipment: [] });
    expect(prompt).toContain("Previous knee injury");
  });

  it("includes additional notes", () => {
    const prompt = buildTrainingPlanUserPrompt({ request: baseRequest, equipment: [] });
    expect(prompt).toContain("Prefer morning runs");
  });

  it("includes today's date for calendar calculation", () => {
    const prompt = buildTrainingPlanUserPrompt({ request: baseRequest, equipment: [] });
    const today = new Date().toISOString().split("T")[0];
    expect(prompt).toContain(today);
  });

  it("includes equipment from gym settings", () => {
    const prompt = buildTrainingPlanUserPrompt({ request: baseRequest, equipment: mockEquipment });
    expect(prompt).toContain("Barbell");
    expect(prompt).toContain("Dumbbells x2");
    expect(prompt).toContain("Treadmill");
    expect(prompt).toContain("strength");
    expect(prompt).toContain("cardio");
  });

  it("omits equipment section when no equipment", () => {
    const prompt = buildTrainingPlanUserPrompt({ request: baseRequest, equipment: [] });
    expect(prompt).not.toContain("Available Equipment");
  });

  it("omits empty optional fields", () => {
    const minimalRequest: TrainingPlanRequest = {
      ...baseRequest,
      goals: "",
      current_fitness: "",
      injuries_limitations: "",
      additional_notes: "",
    };
    const prompt = buildTrainingPlanUserPrompt({ request: minimalRequest, equipment: [] });
    expect(prompt).not.toContain("**Goals:**");
    expect(prompt).not.toContain("**Current Fitness:**");
    expect(prompt).not.toContain("**Injuries/Limitations:**");
    expect(prompt).not.toContain("**Additional Notes:**");
  });

  it("handles singular hour", () => {
    const req = { ...baseRequest, hours_per_day: 1 };
    const prompt = buildTrainingPlanUserPrompt({ request: req, equipment: [] });
    expect(prompt).toContain("1 hour");
    expect(prompt).not.toContain("1 hours");
  });

  it("handles event type with underscores", () => {
    const req = { ...baseRequest, event_type: "half_marathon" as const };
    const prompt = buildTrainingPlanUserPrompt({ request: req, equipment: [] });
    expect(prompt).toContain("half marathon");
  });
});
