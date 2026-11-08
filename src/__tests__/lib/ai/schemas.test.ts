import { describe, it, expect } from "vitest";
import {
  generateWorkoutSchema,
  workoutOutputSchema,
  generateGroupWorkoutSchema,
  groupWorkoutOutputSchema,
  savedGroupWorkoutSchema,
  parseSavedGroupWorkout,
} from "@/lib/ai/schemas";

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
});

describe("generateGroupWorkoutSchema", () => {
  const validInput = {
    profile_id: "p1",
    gym_id: "g1",
    style: "strength" as const,
    duration_min: 45,
    target_rpe: 7,
    body_groups: ["full_body" as const],
    group_size: 3,
  };

  it("accepts valid input", () => {
    expect(generateGroupWorkoutSchema.safeParse(validInput).success).toBe(true);
  });

  it.each([2, 3, 6])("accepts group_size %i", (n) => {
    expect(generateGroupWorkoutSchema.safeParse({ ...validInput, group_size: n }).success).toBe(true);
  });

  it.each([0, 1, 7, 2.5, -2])("rejects group_size %s", (n) => {
    expect(generateGroupWorkoutSchema.safeParse({ ...validInput, group_size: n }).success).toBe(false);
  });

  it("requires group_size", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { group_size: _g, ...rest } = validInput;
    expect(generateGroupWorkoutSchema.safeParse(rest).success).toBe(false);
  });

  it("accepts optional person_names", () => {
    const r = generateGroupWorkoutSchema.safeParse({ ...validInput, person_names: ["Ann", "Bo", ""] });
    expect(r.success).toBe(true);
  });

  it("rejects more person_names than group_size", () => {
    const r = generateGroupWorkoutSchema.safeParse({ ...validInput, person_names: ["a", "b", "c", "d"] });
    expect(r.success).toBe(false);
  });

  it("still validates the base workout fields", () => {
    expect(generateGroupWorkoutSchema.safeParse({ ...validInput, duration_min: 2 }).success).toBe(false);
    expect(generateGroupWorkoutSchema.safeParse({ ...validInput, style: "yoga" }).success).toBe(false);
  });

  it("allows bodyweight and defaults parameters", () => {
    const r = generateGroupWorkoutSchema.safeParse({ ...validInput, bodyweight: true, gym_id: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.parameters).toEqual({});
  });
});

describe("groupWorkoutOutputSchema", () => {
  const validOutput = {
    warmup: [{ name: "Jumping jacks", detail: "60s" }],
    blocks: [
      {
        name: "Block A",
        format: "straight" as const,
        slots: [
          {
            assignments: [
              { person: 0, name: "Back Squat", sets: "3", reps: "8", rest: "90s", equipment_ids: ["barbell-1"] },
              { person: 1, name: "Goblet Squat", sets: "3", reps: "10", rest: "90s", note: "Swap next slot", equipment_ids: ["db-1"] },
            ],
          },
        ],
      },
    ],
    cooldown: [{ name: "Quad stretch", detail: "30s" }],
    coaching: ["Brace your core"],
  };

  it("accepts a valid group workout", () => {
    expect(groupWorkoutOutputSchema.safeParse(validOutput).success).toBe(true);
  });

  it("accepts bodyweight assignments with empty equipment_ids", () => {
    const out = structuredClone(validOutput);
    out.blocks[0].slots[0].assignments[0].equipment_ids = [];
    expect(groupWorkoutOutputSchema.safeParse(out).success).toBe(true);
  });

  it("requires equipment_ids", () => {
    const out = structuredClone(validOutput) as unknown as {
      blocks: { slots: { assignments: Record<string, unknown>[] }[] }[];
    };
    delete out.blocks[0].slots[0].assignments[0].equipment_ids;
    expect(groupWorkoutOutputSchema.safeParse(out).success).toBe(false);
  });

  it("leaves person-index integrity to the validator (schema cannot use .int(): Anthropic rejects integer bounds)", () => {
    const out = structuredClone(validOutput);
    out.blocks[0].slots[0].assignments[0].person = 0.5;
    expect(groupWorkoutOutputSchema.safeParse(out).success).toBe(true);
  });

  it("rejects an invalid block format", () => {
    const out = structuredClone(validOutput) as unknown as { blocks: { format: string }[] };
    out.blocks[0].format = "nope";
    expect(groupWorkoutOutputSchema.safeParse(out).success).toBe(false);
  });

  it("rejects a solo-shaped block (exercises instead of slots)", () => {
    const solo = {
      ...validOutput,
      blocks: [{ name: "A", format: "straight", exercises: [] }],
    };
    expect(groupWorkoutOutputSchema.safeParse(solo).success).toBe(false);
  });

  describe("saved shape", () => {
    it("accepts optional display names", () => {
      const r = savedGroupWorkoutSchema.safeParse({
        ...validOutput,
        person_names: ["Ann", "Bo"],
        equipment_names: { "barbell-1": "Barbell" },
      });
      expect(r.success).toBe(true);
    });

    it("parseSavedGroupWorkout returns null without group_size", () => {
      expect(parseSavedGroupWorkout(validOutput, {})).toBeNull();
      expect(parseSavedGroupWorkout(validOutput, null)).toBeNull();
    });

    it("parseSavedGroupWorkout returns null for solo or malformed data", () => {
      expect(parseSavedGroupWorkout(null, { group_size: 2 })).toBeNull();
      expect(parseSavedGroupWorkout({ blocks: [{ exercises: [] }] }, { group_size: 2 })).toBeNull();
      expect(parseSavedGroupWorkout("junk", { group_size: 2 })).toBeNull();
    });

    it("parseSavedGroupWorkout parses a group workout", () => {
      expect(parseSavedGroupWorkout(validOutput, { group_size: 2 })?.blocks).toHaveLength(1);
    });
  });
});

describe("groupWorkoutOutputSchema — Anthropic structured-output compatibility", () => {
  it("emits no numeric bounds (Anthropic rejects minimum/maximum on integer/number)", async () => {
    const { z } = await import("zod");
    const { groupWorkoutOutputSchema } = await import("@/lib/ai/schemas");
    const json = JSON.stringify(z.toJSONSchema(groupWorkoutOutputSchema));
    expect(json).not.toMatch(/"(minimum|maximum|exclusiveMinimum|exclusiveMaximum|multipleOf)"/);
  });
});
