import { describe, it, expect } from "vitest";
import { generateWorkoutSchema, workoutOutputSchema } from "@/lib/ai/schemas";

describe("generateWorkoutSchema", () => {
  const validInput = {
    profile_id: "p1",
    gym_id: "g1",
    style: "strength" as const,
    duration_min: 60,
    target_rpe: 7,
    body_groups: ["chest" as const],
  };

  it("accepts valid input", () => {
    const result = generateWorkoutSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects missing profile_id", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { profile_id: _profile_id, ...rest } = validInput;
    const result = generateWorkoutSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty profile_id", () => {
    const result = generateWorkoutSchema.safeParse({ ...validInput, profile_id: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid style", () => {
    const result = generateWorkoutSchema.safeParse({ ...validInput, style: "yoga" });
    expect(result.success).toBe(false);
  });

  it("rejects duration below minimum (5)", () => {
    const result = generateWorkoutSchema.safeParse({ ...validInput, duration_min: 4 });
    expect(result.success).toBe(false);
  });

  it("rejects duration above maximum (180)", () => {
    const result = generateWorkoutSchema.safeParse({ ...validInput, duration_min: 181 });
    expect(result.success).toBe(false);
  });

  it("accepts boundary duration values", () => {
    expect(generateWorkoutSchema.safeParse({ ...validInput, duration_min: 5 }).success).toBe(true);
    expect(generateWorkoutSchema.safeParse({ ...validInput, duration_min: 180 }).success).toBe(true);
  });

  it("rejects RPE below 1", () => {
    const result = generateWorkoutSchema.safeParse({ ...validInput, target_rpe: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects RPE above 10", () => {
    const result = generateWorkoutSchema.safeParse({ ...validInput, target_rpe: 11 });
    expect(result.success).toBe(false);
  });

  it("accepts boundary RPE values", () => {
    expect(generateWorkoutSchema.safeParse({ ...validInput, target_rpe: 1 }).success).toBe(true);
    expect(generateWorkoutSchema.safeParse({ ...validInput, target_rpe: 10 }).success).toBe(true);
  });

  it("defaults parameters to empty object", () => {
    const result = generateWorkoutSchema.parse(validInput);
    expect(result.parameters).toEqual({});
  });

  it("rejects empty body_groups", () => {
    const result = generateWorkoutSchema.safeParse({ ...validInput, body_groups: [] });
    expect(result.success).toBe(false);
  });

  it("defaults participant count to one", () => {
    expect(generateWorkoutSchema.parse(validInput).participant_count).toBe(1);
  });

  it("accepts a group workout with a format", () => {
    const result = generateWorkoutSchema.safeParse({
      ...validInput,
      participant_count: 6,
      group_format: "station_rotation",
    });
    expect(result.success).toBe(true);
  });

  it("requires a format for multiple participants", () => {
    expect(generateWorkoutSchema.safeParse({ ...validInput, participant_count: 2 }).success).toBe(false);
  });

  it("rejects participant counts above six", () => {
    expect(generateWorkoutSchema.safeParse({
      ...validInput,
      participant_count: 7,
      group_format: "shared",
    }).success).toBe(false);
  });
});

describe("workoutOutputSchema", () => {
  const validOutput = {
    warmup: [{ name: "Jog", detail: "5 min" }],
    blocks: [
      {
        name: "Block A",
        format: "straight" as const,
        exercises: [{ name: "Squat", sets: "3", reps: "10", rest: "90s" }],
      },
    ],
    cooldown: [{ name: "Stretch", detail: "5 min" }],
    coaching: ["Focus on form"],
  };

  it("accepts valid output", () => {
    const result = workoutOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it("requires warmup array", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { warmup: _warmup, ...rest } = validOutput;
    const result = workoutOutputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("requires blocks array", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { blocks: _blocks, ...rest } = validOutput;
    const result = workoutOutputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("validates exercise fields", () => {
    const invalid = {
      ...validOutput,
      blocks: [{ name: "A", format: "straight", exercises: [{ name: "Squat" }] }],
    };
    const result = workoutOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("validates block format enum", () => {
    const invalid = {
      ...validOutput,
      blocks: [{ ...validOutput.blocks[0], format: "invalid" }],
    };
    const result = workoutOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("allows optional exercise note", () => {
    const withNote = {
      ...validOutput,
      blocks: [
        {
          ...validOutput.blocks[0],
          exercises: [{ name: "Squat", sets: "3", reps: "10", rest: "90s", note: "Deep squat" }],
        },
      ],
    };
    const result = workoutOutputSchema.safeParse(withNote);
    expect(result.success).toBe(true);
  });

  it("accepts a structured group schedule", () => {
    const result = workoutOutputSchema.safeParse({
      ...validOutput,
      group: {
        participant_count: 2,
        format: "station_rotation",
        rounds: [{
          name: "Round 1",
          duration: "5 min",
          assignments: [
            { participant: 1, exercise: "Squat", work: "10 reps", rest: "30s", equipment_ids: ["rack"] },
            { participant: 2, exercise: "Push-up", work: "10 reps", rest: "30s", equipment_ids: [] },
          ],
        }],
      },
    });
    expect(result.success).toBe(true);
  });
});
