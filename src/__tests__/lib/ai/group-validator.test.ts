import { describe, it, expect } from "vitest";
import { validateGroupWorkout } from "@/lib/ai/group-validator";
import type { GroupWorkoutOutput, GroupAssignment } from "@/lib/ai/schemas";
import type { Equipment, SharedResourceGroup } from "@/types/gym";

function eq(id: string, name: string, quantity = 1): Equipment {
  return { id, gym_id: "g", slug: id, name, category: "strength", attributes: {}, quantity };
}

function a(person: number, ids: string[] = [], name = `Ex ${person}`): GroupAssignment {
  return { person, name, sets: "3", reps: "10", rest: "60s", equipment_ids: ids };
}

function plan(...slots: GroupAssignment[][]): GroupWorkoutOutput {
  return {
    warmup: [],
    blocks: [
      {
        name: "Block A",
        format: "straight",
        slots: slots.map((assignments) => ({ assignments })),
      },
    ],
    cooldown: [],
    coaching: [],
  };
}

function group(
  constraint: SharedResourceGroup["constraint"],
  equipment_ids: string[],
  resource_name = "Rack Area"
): SharedResourceGroup {
  return { id: `sr-${constraint}`, gym_id: "g", resource_name, equipment_ids, constraint };
}

const barbell = eq("barbell", "Barbell", 1);
const dumbbells = eq("db", "Dumbbells", 2);
const cable = eq("cable", "Cable Machine", 1);
const bench = eq("bench", "Bench", 1);
const allEquipment = [barbell, dumbbells, cable, bench];

function validate(
  output: GroupWorkoutOutput,
  opts: Partial<{ equipment: Equipment[]; sharedResources: SharedResourceGroup[]; groupSize: number; bodyweight: boolean }> = {}
) {
  return validateGroupWorkout(output, {
    equipment: allEquipment,
    sharedResources: [],
    groupSize: 2,
    ...opts,
  });
}

describe("validateGroupWorkout()", () => {
  describe("quantity limits", () => {
    it("accepts people on different items", () => {
      const r = validate(plan([a(0, ["barbell"]), a(1, ["db"])]));
      expect(r).toEqual({ valid: true, violations: [] });
    });

    it("rejects qty 1 item used by 2 people", () => {
      const r = validate(plan([a(0, ["barbell"]), a(1, ["barbell"])]));
      expect(r.valid).toBe(false);
      expect(r.violations).toHaveLength(1);
      expect(r.violations[0]).toContain("Block 1");
      expect(r.violations[0]).toContain("slot 1");
      expect(r.violations[0]).toContain("Barbell");
      expect(r.violations[0]).toContain("barbell");
      expect(r.violations[0]).toContain("2 people");
      expect(r.violations[0]).toContain("only 1 available");
    });

    it("accepts qty 2 item used by 2 people", () => {
      const r = validate(plan([a(0, ["db"]), a(1, ["db"])]));
      expect(r.valid).toBe(true);
    });

    it("rejects qty 2 item used by 3 people", () => {
      const r = validate(plan([a(0, ["db"]), a(1, ["db"]), a(2, ["db"])]), { groupSize: 3 });
      expect(r.valid).toBe(false);
      expect(r.violations).toHaveLength(1);
      expect(r.violations[0]).toContain("Dumbbells");
      expect(r.violations[0]).toContain("3 people");
      expect(r.violations[0]).toContain("only 2 available");
    });

    it("counts one person once per item even if the id is repeated", () => {
      const r = validate(plan([a(0, ["barbell", "barbell"]), a(1, ["db"])]));
      expect(r.valid).toBe(true);
    });

    it("allows one person to use several different items", () => {
      const r = validate(plan([a(0, ["barbell", "bench"]), a(1, ["db"])]));
      expect(r.valid).toBe(true);
    });

    it("allows the same item in different slots (swap)", () => {
      const r = validate(
        plan(
          [a(0, ["barbell"]), a(1, ["db"])],
          [a(0, ["db"]), a(1, ["barbell"])]
        )
      );
      expect(r.valid).toBe(true);
    });

    it("reports the offending slot number", () => {
      const r = validate(
        plan(
          [a(0, ["barbell"]), a(1, ["db"])],
          [a(0, ["cable"]), a(1, ["cable"])]
        )
      );
      expect(r.violations).toHaveLength(1);
      expect(r.violations[0]).toContain("slot 2");
      expect(r.violations[0]).toContain("Cable Machine");
    });

    it("reports violations across blocks and names the block", () => {
      const output = plan([a(0, ["barbell"]), a(1, ["barbell"])]);
      output.blocks.push({
        name: "Block B",
        format: "straight",
        slots: [{ assignments: [a(0, ["cable"]), a(1, ["cable"])] }],
      });
      const r = validate(output);
      expect(r.violations).toHaveLength(2);
      expect(r.violations[0]).toContain("Block 1");
      expect(r.violations[1]).toContain("Block 2");
      expect(r.violations[1]).toContain('"Block B"');
    });

    it("treats quantity 0 as unusable", () => {
      const r = validate(plan([a(0, ["x"]), a(1)]), { equipment: [eq("x", "Broken Rig", 0)] });
      expect(r.valid).toBe(false);
      expect(r.violations[0]).toContain("only 0 available");
    });
  });

  describe("person coverage", () => {
    it("rejects a missing person", () => {
      const r = validate(plan([a(0, ["db"])]));
      expect(r.valid).toBe(false);
      expect(r.violations).toHaveLength(1);
      expect(r.violations[0]).toContain("person 1");
      expect(r.violations[0]).toContain("no assignment");
      expect(r.violations[0]).toContain("slot 1");
    });

    it("rejects a duplicated person", () => {
      const r = validate(plan([a(0, ["db"]), a(0, ["cable"]), a(1)]));
      expect(r.valid).toBe(false);
      expect(r.violations.some((v) => v.includes("person 0") && v.includes("2 assignments"))).toBe(true);
    });

    it("rejects an out-of-range person index", () => {
      const r = validate(plan([a(0), a(1), a(2)]));
      expect(r.valid).toBe(false);
      expect(r.violations[0]).toContain("invalid person index 2");
      expect(r.violations[0]).toContain("0 to 1");
    });

    it("rejects a negative person index", () => {
      const r = validate(plan([a(-1), a(0), a(1)]));
      expect(r.valid).toBe(false);
      expect(r.violations[0]).toContain("invalid person index -1");
    });

    it("rejects a non-integer person index", () => {
      const r = validate(plan([a(0.5), a(0), a(1)]));
      expect(r.valid).toBe(false);
      expect(r.violations[0]).toContain("invalid person index 0.5");
    });

    it("checks every slot, not just the first", () => {
      const r = validate(plan([a(0), a(1)], [a(0)]));
      expect(r.valid).toBe(false);
      expect(r.violations[0]).toContain("slot 2");
    });

    it("handles a 6-person group", () => {
      const people = [0, 1, 2, 3, 4, 5].map((p) => a(p));
      expect(validate(plan(people), { groupSize: 6 }).valid).toBe(true);
      expect(validate(plan(people.slice(0, 5)), { groupSize: 6 }).valid).toBe(false);
    });
  });

  describe("structure", () => {
    it("rejects a workout with no blocks", () => {
      const r = validate({ warmup: [], blocks: [], cooldown: [], coaching: [] });
      expect(r.valid).toBe(false);
      expect(r.violations[0]).toContain("no blocks");
    });

    it("rejects a block with no slots", () => {
      const r = validate(plan());
      expect(r.valid).toBe(false);
      expect(r.violations[0]).toContain("no slots");
    });
  });

  describe("unknown equipment ids", () => {
    it("rejects unknown ids and names the id", () => {
      const r = validate(plan([a(0, ["nope"]), a(1, ["db"])]));
      expect(r.valid).toBe(false);
      expect(r.violations).toHaveLength(1);
      expect(r.violations[0]).toContain('"nope"');
      expect(r.violations[0]).toContain("unknown equipment id");
      expect(r.violations[0]).toContain("person 0");
    });

    it("rejects an equipment name used in place of its id", () => {
      const r = validate(plan([a(0, ["Barbell"]), a(1)]));
      expect(r.valid).toBe(false);
      expect(r.violations[0]).toContain("unknown equipment id");
    });
  });

  describe("never_together", () => {
    const sr = [group("never_together", ["barbell", "cable"], "Floor Space")];

    it("rejects two items from the group used in different slots", () => {
      const r = validate(
        plan(
          [a(0, ["barbell"]), a(1, ["db"])],
          [a(0, ["db"]), a(1, ["cable"])]
        ),
        { sharedResources: sr }
      );
      expect(r.valid).toBe(false);
      expect(r.violations).toHaveLength(1);
      expect(r.violations[0]).toContain("Floor Space");
      expect(r.violations[0]).toContain("never_together");
      expect(r.violations[0]).toContain("ONE item");
    });

    it("rejects two items from the group used across blocks", () => {
      const output = plan([a(0, ["barbell"]), a(1, ["db"])]);
      output.blocks.push({
        name: "Block B",
        format: "straight",
        slots: [{ assignments: [a(0, ["cable"]), a(1)] }],
      });
      const r = validate(output, { sharedResources: sr });
      expect(r.valid).toBe(false);
      expect(r.violations[0]).toContain("never_together");
    });

    it("rejects two items from the group used simultaneously", () => {
      const r = validate(plan([a(0, ["barbell"]), a(1, ["cable"])]), { sharedResources: sr });
      expect(r.valid).toBe(false);
      expect(r.violations[0]).toContain("never_together");
    });

    it("accepts using only one item from the group, repeatedly", () => {
      const r = validate(
        plan(
          [a(0, ["barbell"]), a(1, ["db"])],
          [a(0, ["db"]), a(1, ["barbell"])]
        ),
        { sharedResources: sr }
      );
      expect(r.valid).toBe(true);
    });

    it("accepts using none of the group", () => {
      const r = validate(plan([a(0, ["db"]), a(1, ["bench"])]), { sharedResources: sr });
      expect(r.valid).toBe(true);
    });
  });

  describe("no_superset", () => {
    const sr = [group("no_superset", ["barbell", "bench"], "Rack")];

    it("rejects two people on different items of the group in one slot", () => {
      const r = validate(plan([a(0, ["barbell"]), a(1, ["bench"])]), { sharedResources: sr });
      expect(r.valid).toBe(false);
      expect(r.violations).toHaveLength(1);
      expect(r.violations[0]).toContain('"Rack"');
      expect(r.violations[0]).toContain("no_superset");
      expect(r.violations[0]).toContain("person 0, person 1");
    });

    it("rejects two people on the same group item (qty 2) in one slot", () => {
      const r = validate(plan([a(0, ["wr"]), a(1, ["wr"])]), {
        equipment: [eq("wr", "Wall Rack", 2), dumbbells],
        sharedResources: [group("no_superset", ["wr", "db"], "Wall")],
      });
      expect(r.valid).toBe(false);
      expect(r.violations[0]).toContain("no_superset");
    });

    it("accepts one person on the group while another uses other gear", () => {
      const r = validate(plan([a(0, ["barbell"]), a(1, ["db"])]), { sharedResources: sr });
      expect(r.valid).toBe(true);
    });

    it("accepts one person using two group items in the same slot", () => {
      const r = validate(plan([a(0, ["barbell", "bench"]), a(1, ["db"])]), { sharedResources: sr });
      expect(r.valid).toBe(true);
    });

    it("accepts different people on group items in different slots", () => {
      const r = validate(
        plan(
          [a(0, ["barbell"]), a(1, ["db"])],
          [a(0, ["db"]), a(1, ["bench"])]
        ),
        { sharedResources: sr }
      );
      expect(r.valid).toBe(true);
    });
  });

  describe("needs_setup_change", () => {
    const sr = [group("needs_setup_change", ["barbell", "cable"], "Power Rack")];

    it("rejects two people on different items of the group in one slot", () => {
      const r = validate(plan([a(0, ["barbell"]), a(1, ["cable"])]), { sharedResources: sr });
      expect(r.valid).toBe(false);
      expect(r.violations[0]).toContain("needs_setup_change");
      expect(r.violations[0]).toContain("Power Rack");
    });

    it("accepts switching items between slots", () => {
      const r = validate(
        plan([a(0, ["barbell"]), a(1)], [a(0), a(1, ["cable"])]),
        { sharedResources: sr }
      );
      expect(r.valid).toBe(true);
    });
  });

  describe("group_together", () => {
    it("imposes no concurrency rule beyond quantity", () => {
      const r = validate(plan([a(0, ["barbell"]), a(1, ["bench"])]), {
        sharedResources: [group("group_together", ["barbell", "bench"])],
      });
      expect(r.valid).toBe(true);
    });
  });

  describe("bodyweight mode", () => {
    it("accepts assignments with no equipment", () => {
      const r = validate(plan([a(0), a(1)]), { bodyweight: true, equipment: [] });
      expect(r).toEqual({ valid: true, violations: [] });
    });

    it("rejects any equipment ids", () => {
      const r = validate(plan([a(0, ["db"]), a(1)]), { bodyweight: true });
      expect(r.valid).toBe(false);
      expect(r.violations).toHaveLength(1);
      expect(r.violations[0]).toContain("bodyweight");
      expect(r.violations[0]).toContain("person 0");
    });

    it("still enforces person coverage", () => {
      const r = validate(plan([a(0)]), { bodyweight: true, equipment: [] });
      expect(r.valid).toBe(false);
      expect(r.violations[0]).toContain("person 1");
    });

    it("does not apply quantity checks when no equipment is allowed", () => {
      const r = validate(plan([a(0, ["barbell"]), a(1, ["barbell"])]), { bodyweight: true });
      expect(r.violations.every((v) => v.includes("bodyweight"))).toBe(true);
    });
  });

  it("collects every violation in a single pass", () => {
    const r = validate(
      plan(
        [a(0, ["barbell"]), a(1, ["barbell"])],
        [a(0, ["nope"])]
      )
    );
    expect(r.valid).toBe(false);
    expect(r.violations.length).toBeGreaterThanOrEqual(3);
  });
});
