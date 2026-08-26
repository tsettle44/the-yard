import { describe, expect, it } from "vitest";
import { validateGroupSchedule } from "@/lib/workout/validate-group-schedule";
import { makeEquipment, makeSharedResource } from "../../fixtures";

const schedule = {
  participant_count: 2,
  format: "station_rotation" as const,
  rounds: [{
    name: "Round 1",
    duration: "5 min",
    assignments: [
      { participant: 1, exercise: "Squat", work: "10 reps", rest: "30s", equipment_ids: ["barbell"] },
      { participant: 2, exercise: "Push-up", work: "10 reps", rest: "30s", equipment_ids: [] },
    ],
  }],
};

describe("validateGroupSchedule", () => {
  it("accepts a complete schedule within capacity", () => {
    const result = validateGroupSchedule({
      schedule,
      participantCount: 2,
      format: "station_rotation",
      equipment: [makeEquipment({ id: "barbell", quantity: 1 })],
      sharedResources: [],
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("rejects simultaneous demand above equipment quantity", () => {
    const result = validateGroupSchedule({
      schedule: {
        ...schedule,
        rounds: [{
          ...schedule.rounds[0],
          assignments: schedule.rounds[0].assignments.map((assignment) => ({
            ...assignment,
            equipment_ids: ["barbell"],
          })),
        }],
      },
      participantCount: 2,
      format: "station_rotation",
      equipment: [makeEquipment({ id: "barbell", quantity: 1 })],
      sharedResources: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("only 1");
  });

  it("allows demand up to the configured quantity", () => {
    const sharedSchedule = {
      ...schedule,
      format: "shared" as const,
      rounds: [{
        ...schedule.rounds[0],
        assignments: schedule.rounds[0].assignments.map((assignment) => ({
          ...assignment,
          equipment_ids: ["dumbbells"],
        })),
      }],
    };
    const result = validateGroupSchedule({
      schedule: sharedSchedule,
      participantCount: 2,
      format: "shared",
      equipment: [makeEquipment({ id: "dumbbells", quantity: 2 })],
      sharedResources: [],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects duplicate participants and unknown equipment", () => {
    const invalidSchedule = {
      ...schedule,
      rounds: [{
        ...schedule.rounds[0],
        assignments: schedule.rounds[0].assignments.map((assignment) => ({
          ...assignment,
          participant: 1,
          equipment_ids: ["unknown"],
        })),
      }],
    };
    const result = validateGroupSchedule({
      schedule: invalidSchedule,
      participantCount: 2,
      format: "station_rotation",
      equipment: [],
      sharedResources: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("more than once");
    expect(result.errors.join(" ")).toContain("unavailable equipment");
  });

  it("rejects simultaneous use of a no-superset shared resource", () => {
    const resourceSchedule = {
      ...schedule,
      rounds: [{
        ...schedule.rounds[0],
        assignments: [
          { ...schedule.rounds[0].assignments[0], equipment_ids: ["barbell"] },
          { ...schedule.rounds[0].assignments[1], equipment_ids: ["rack"] },
        ],
      }],
    };
    const result = validateGroupSchedule({
      schedule: resourceSchedule,
      participantCount: 2,
      format: "station_rotation",
      equipment: [
        makeEquipment({ id: "barbell" }),
        makeEquipment({ id: "rack", slug: "squat-rack", name: "Rack" }),
      ],
      sharedResources: [makeSharedResource({ equipment_ids: ["barbell", "rack"], constraint: "no_superset" })],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("double-books shared resource");
  });
});
