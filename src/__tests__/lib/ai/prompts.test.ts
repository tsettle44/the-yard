import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserPrompt, buildGroupSystemPrompt, buildGroupUserPrompt } from "@/lib/ai/prompts";
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

describe("group prompts", () => {
  const barbell = makeEquipment({ id: "eq-barbell", name: "Barbell", quantity: 1 });
  const dumbbells = makeEquipment({ id: "eq-db", name: "Dumbbells", quantity: 4, category: "strength" });
  const rack = makeSharedResource({
    resource_name: "Rack Area",
    equipment_ids: ["eq-barbell", "eq-db"],
    constraint: "no_superset",
  });
  const never = makeSharedResource({
    resource_name: "Floor Space",
    equipment_ids: ["eq-barbell"],
    constraint: "never_together",
  });

  const base = {
    profile: makeProfile({ name: "Crew" }),
    equipment: [barbell, dumbbells],
    sharedResources: [rack, never],
    layoutNotes: "Garage",
    style: "strength" as const,
    durationMin: 45,
    targetRpe: 7,
    bodyGroups: ["full_body" as const],
    parameters: {},
    groupSize: 4,
  };

  describe("buildGroupSystemPrompt()", () => {
    const prompt = buildGroupSystemPrompt(4);

    it("states the number of people and index range", () => {
      expect(prompt).toContain("4 people");
      expect(prompt).toContain("0 to 3");
    });

    it("explains the slot/assignment model", () => {
      expect(prompt).toContain("SLOT");
      expect(prompt).toContain("assignments");
      expect(prompt).toContain("EXACTLY ONE assignment per person");
      expect(prompt).toContain("equipment_ids");
    });

    it("states the hard quantity rule", () => {
      expect(prompt).toContain("LESS THAN OR EQUAL TO its quantity");
      expect(prompt).toContain("HARD CONSTRAINT");
    });

    it("contains all shared-resource rules", () => {
      expect(prompt).toContain("NEVER TOGETHER");
      expect(prompt).toContain("NO SUPERSET");
      expect(prompt).toContain("NEEDS SETUP CHANGE");
      expect(prompt).toContain("GROUP TOGETHER");
    });

    it("includes a barbell worked example with a swap", () => {
      expect(prompt).toContain("WORKED EXAMPLE");
      expect(prompt).toContain("Barbell Back Squat");
      expect(prompt).toContain("swap");
    });

    it("bodyweight variant forbids equipment", () => {
      const bw = buildGroupSystemPrompt(3, true);
      expect(bw).toContain("BODYWEIGHT-ONLY");
      expect(bw).toContain("EMPTY equipment_ids");
      expect(bw).toContain("0 to 2");
      expect(bw).not.toContain("WORKED EXAMPLE");
    });
  });

  describe("buildGroupUserPrompt()", () => {
    it("lists each equipment item with its id and quantity", () => {
      const prompt = buildGroupUserPrompt(base);
      expect(prompt).toContain('Barbell — id: "eq-barbell" — quantity: 1');
      expect(prompt).toContain('Dumbbells — id: "eq-db" — quantity: 4');
    });

    it("includes the group size and a person list", () => {
      const prompt = buildGroupUserPrompt(base);
      expect(prompt).toContain("4 people");
      expect(prompt).toContain("Person 0");
      expect(prompt).toContain("Person 3");
      expect(prompt).not.toContain("Person 4");
    });

    it("uses person names when provided", () => {
      const prompt = buildGroupUserPrompt({ ...base, personNames: ["Ann", "Bo"] });
      expect(prompt).toContain("Person 0: Ann");
      expect(prompt).toContain("Person 1: Bo");
      expect(prompt).toContain("- Person 2\n");
    });

    it("lists shared resources with ids and rules", () => {
      const prompt = buildGroupUserPrompt(base);
      expect(prompt).toContain("Rack Area");
      expect(prompt).toContain('Barbell (id: "eq-barbell")');
      expect(prompt).toContain("NO SUPERSET");
      expect(prompt).toContain("NEVER TOGETHER");
    });

    it("includes workout parameters", () => {
      const prompt = buildGroupUserPrompt({ ...base, parameters: { notes: "no jumping" } });
      expect(prompt).toContain("Duration: 45 minutes");
      expect(prompt).toContain("Target RPE: 7/10");
      expect(prompt).toContain("Notes: no jumping");
    });

    it("bodyweight prompt omits equipment and requires empty equipment_ids", () => {
      const prompt = buildGroupUserPrompt({ ...base, equipment: [], sharedResources: [], bodyweight: true });
      expect(prompt).toContain("bodyweight-only");
      expect(prompt).toContain("equipment_ids array must be empty");
      expect(prompt).not.toContain("Available Equipment");
    });
  });

  it("does not change the solo prompts", () => {
    expect(buildSystemPrompt()).not.toContain("GROUP WORKOUT MODEL");
    expect(buildUserPrompt(base)).not.toContain("GROUP workout");
  });
});

describe("buildGroupUserPrompt — never_together planning step", () => {
  it("tells the model to choose exactly one item up front", () => {
    const equipment = [
      { id: "a", gym_id: "g", slug: "barbell", name: "Barbell", category: "strength", attributes: {}, quantity: 1 },
      { id: "b", gym_id: "g", slug: "bench", name: "Bench Press", category: "strength", attributes: {}, quantity: 1 },
    ] as never;
    const sharedResources = [
      { id: "s", gym_id: "g", resource_name: "Rack", equipment_ids: ["a", "b"], constraint: "never_together" },
    ] as never;
    const prompt = buildGroupUserPrompt({
      profile: { name: "T", fitness_level: "intermediate", preferred_styles: [], goals: "", preferences: {} } as never,
      equipment,
      sharedResources,
      layoutNotes: "",
      style: "strength",
      durationMin: 45,
      targetRpe: 7,
      bodyGroups: ["full_body"],
      parameters: {},
      groupSize: 2,
    });
    expect(prompt).toContain("PLANNING STEP");
    expect(prompt).toContain("exactly ONE of [Barbell, Bench Press]");
  });
});
