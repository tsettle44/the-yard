import { describe, it, expect } from "vitest";
import { generateIcal } from "@/lib/ical-export";
import type { TrainingPlanOutputType } from "@/lib/ai/training-plan-schemas";

const mockPlan: TrainingPlanOutputType = {
  plan_name: "Marathon Training Plan",
  event_type: "marathon",
  event_date: "2026-10-11",
  total_weeks: 16,
  overview: "A progressive plan",
  phases: [{ name: "Base", weeks: "Weeks 1-4", description: "Build base" }],
  weeks: [
    {
      week_number: 1,
      phase: "Base Building",
      focus: "Easy aerobic base",
      sessions: [
        {
          date: "2026-07-06",
          day_of_week: "Monday",
          title: "Easy Run",
          type: "run",
          duration_minutes: 30,
          description: "Easy pace run",
          intensity: "easy",
          details: ["Run at conversational pace", "Heart rate zone 2"],
        },
        {
          date: "2026-07-08",
          day_of_week: "Wednesday",
          title: "Tempo Run",
          type: "run",
          duration_minutes: 45,
          description: "Moderate tempo",
          intensity: "moderate",
          details: ["10 min warmup", "25 min tempo"],
        },
      ],
    },
    {
      week_number: 2,
      phase: "Base Building",
      focus: "Increase volume",
      sessions: [
        {
          date: "2026-07-13",
          day_of_week: "Monday",
          title: "Long Run",
          type: "run",
          duration_minutes: 60,
          description: "Longer run for base building",
          intensity: "easy",
          details: ["Steady effort", "Stay hydrated"],
        },
      ],
    },
  ],
  race_day_tips: ["Start slow"],
  notes: ["Listen to your body"],
};

describe("generateIcal", () => {
  it("generates valid iCal structure", () => {
    const ical = generateIcal(mockPlan);
    expect(ical).toContain("BEGIN:VCALENDAR");
    expect(ical).toContain("END:VCALENDAR");
    expect(ical).toContain("VERSION:2.0");
    expect(ical).toContain("PRODID:-//The Yard//Training Plan//EN");
  });

  it("includes calendar name", () => {
    const ical = generateIcal(mockPlan);
    expect(ical).toContain("X-WR-CALNAME:Marathon Training Plan");
  });

  it("creates events for each session", () => {
    const ical = generateIcal(mockPlan);
    const eventCount = (ical.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(3);
  });

  it("formats dates correctly", () => {
    const ical = generateIcal(mockPlan);
    expect(ical).toContain("DTSTART;VALUE=DATE:20260706");
    expect(ical).toContain("DTSTART;VALUE=DATE:20260708");
    expect(ical).toContain("DTSTART;VALUE=DATE:20260713");
  });

  it("includes session title and type in summary", () => {
    const ical = generateIcal(mockPlan);
    expect(ical).toContain("SUMMARY:Easy Run (run)");
    expect(ical).toContain("SUMMARY:Tempo Run (run)");
    expect(ical).toContain("SUMMARY:Long Run (run)");
  });

  it("includes description with session details", () => {
    const ical = generateIcal(mockPlan);
    expect(ical).toContain("Easy pace run");
    expect(ical).toContain("Week 1 - Base Building");
    expect(ical).toContain("Intensity: easy");
    expect(ical).toContain("Duration: 30 min");
  });

  it("includes session details in description", () => {
    const ical = generateIcal(mockPlan);
    expect(ical).toContain("Run at conversational pace");
    expect(ical).toContain("Heart rate zone 2");
  });

  it("includes categories with phase name", () => {
    const ical = generateIcal(mockPlan);
    expect(ical).toContain("CATEGORIES:Base Building");
  });

  it("includes custom training metadata", () => {
    const ical = generateIcal(mockPlan);
    expect(ical).toContain("X-TRAINING-INTENSITY:easy");
    expect(ical).toContain("X-TRAINING-DURATION:30");
  });

  it("escapes special characters", () => {
    const planWithSpecialChars: TrainingPlanOutputType = {
      ...mockPlan,
      weeks: [
        {
          week_number: 1,
          phase: "Base",
          focus: "Test",
          sessions: [
            {
              date: "2026-07-06",
              day_of_week: "Monday",
              title: "Run, Sprint; Repeat",
              type: "run",
              duration_minutes: 30,
              description: "Run with commas, semicolons; and more",
              intensity: "hard",
              details: [],
            },
          ],
        },
      ],
    };
    const ical = generateIcal(planWithSpecialChars);
    expect(ical).toContain("SUMMARY:Run\\, Sprint\\; Repeat (run)");
  });

  it("uses CRLF line endings", () => {
    const ical = generateIcal(mockPlan);
    expect(ical).toContain("\r\n");
  });

  it("has unique UIDs for each event", () => {
    const ical = generateIcal(mockPlan);
    const uids = ical.match(/UID:.+/g) || [];
    const uniqueUids = new Set(uids);
    expect(uniqueUids.size).toBe(uids.length);
  });
});
