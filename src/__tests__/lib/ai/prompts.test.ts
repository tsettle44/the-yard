import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import { makeProfile, makeEquipment, makeSharedResource } from "../../fixtures";

describe("buildSystemPrompt()", () => {
  const prompt = buildSystemPrompt();

  it("contains NEVER TOGETHER constraint rule", () => {
    expect(prompt).toContain("NEVER TOGETHER");
  });

  it("contains NO SUPERSET constraint rule", () => {
    expect(prompt).toContain("NO SUPERSET");
  });

  it("contains GROUP TOGETHER constraint rule", () => {
    expect(prompt).toContain("GROUP TOGETHER");
  });

  it("contains NEEDS SETUP CHANGE constraint rule", () => {
    expect(prompt).toContain("NEEDS SETUP CHANGE");
  });

  it("mentions warm-up and cool-down", () => {
    expect(prompt).toContain("warm-up");
    expect(prompt).toContain("cool-down");
  });

  it("specifies output format", () => {
    expect(prompt).toContain("OUTPUT FORMAT");
  });
});

describe("buildUserPrompt()", () => {
  it("includes profile info", () => {
    const profile = makeProfile({ name: "John", fitness_level: "advanced", goals: "Get strong" });
    const prompt = buildUserPrompt({
      profile,
      equipment: [],
      sharedResources: [],
      layoutNotes: "",
      style: "strength",
      durationMin: 60,
      targetRpe: 7,
      bodyGroups: ["chest"],
      parameters: {},
    });
    expect(prompt).toContain("John");
    expect(prompt).toContain("advanced");
    expect(prompt).toContain("Get strong");
  });

  it("lists equipment with quantities", () => {
    const eq = makeEquipment({ name: "Dumbbells", quantity: 2, category: "strength" });
    const prompt = buildUserPrompt({
      profile: makeProfile(),
      equipment: [eq],
      sharedResources: [],
      layoutNotes: "",
      style: "strength",
      durationMin: 60,
      targetRpe: 7,
      bodyGroups: ["chest"],
      parameters: {},
    });
    expect(prompt).toContain("Dumbbells x2");
  });

  it("shows 'Bodyweight only' for empty equipment", () => {
    const prompt = buildUserPrompt({
      profile: makeProfile(),
      equipment: [],
      sharedResources: [],
      layoutNotes: "",
      style: "strength",
      durationMin: 60,
      targetRpe: 7,
      bodyGroups: ["chest"],
      parameters: {},
    });
    expect(prompt).toContain("Bodyweight only");
  });

  it("formats shared resources with constraints", () => {
    const eq1 = makeEquipment({ id: "eq1", name: "Barbell" });
    const eq2 = makeEquipment({ id: "eq2", name: "Squat Rack" });
    const sr = makeSharedResource({
      resource_name: "Barbell Station",
      equipment_ids: ["eq1", "eq2"],
      constraint: "group_together",
    });
    const prompt = buildUserPrompt({
      profile: makeProfile(),
      equipment: [eq1, eq2],
      sharedResources: [sr],
      layoutNotes: "",
      style: "strength",
      durationMin: 60,
      targetRpe: 7,
      bodyGroups: ["chest"],
      parameters: {},
    });
    expect(prompt).toContain("Barbell Station");
    expect(prompt).toContain("GROUP TOGETHER");
  });

  it("includes layout notes", () => {
    const prompt = buildUserPrompt({
      profile: makeProfile(),
      equipment: [],
      sharedResources: [],
      layoutNotes: "Small garage, 10x10 feet",
      style: "strength",
      durationMin: 60,
      targetRpe: 7,
      bodyGroups: ["chest"],
      parameters: {},
    });
    expect(prompt).toContain("Small garage, 10x10 feet");
  });

  it("includes workout parameters", () => {
    const prompt = buildUserPrompt({
      profile: makeProfile(),
      equipment: [],
      sharedResources: [],
      layoutNotes: "",
      style: "strength",
      durationMin: 60,
      targetRpe: 7,
      bodyGroups: ["chest"],
      parameters: { supersets: true, notes: "Focus on compound lifts" },
    });
    expect(prompt).toContain("supersets");
    expect(prompt).toContain("Focus on compound lifts");
  });

  it("includes injuries and avoided exercises", () => {
    const profile = makeProfile({
      preferences: {
        injuries: ["bad knee"],
        avoidedExercises: ["deadlift"],
      },
    });
    const prompt = buildUserPrompt({
      profile,
      equipment: [],
      sharedResources: [],
      layoutNotes: "",
      style: "strength",
      durationMin: 60,
      targetRpe: 7,
      bodyGroups: ["chest"],
      parameters: {},
    });
    expect(prompt).toContain("bad knee");
    expect(prompt).toContain("deadlift");
  });
});
