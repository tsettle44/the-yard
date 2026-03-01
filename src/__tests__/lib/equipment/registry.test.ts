import { describe, it, expect } from "vitest";
import {
  equipmentRegistry,
  getEquipmentByCategory,
  getEquipmentBySlug,
  resourceSuggestions,
  getApplicableSuggestions,
} from "@/lib/equipment/registry";

describe("equipmentRegistry", () => {
  it("has all expected items", () => {
    expect(equipmentRegistry.length).toBeGreaterThanOrEqual(33);
  });

  it("all items have valid slugs (lowercase with hyphens)", () => {
    for (const item of equipmentRegistry) {
      expect(item.slug).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it("all slugs are unique", () => {
    const slugs = equipmentRegistry.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("filters by category", () => {
    const strength = getEquipmentByCategory("strength");
    expect(strength.length).toBeGreaterThan(0);
    expect(strength.every((e) => e.category === "strength")).toBe(true);
  });

  it("looks up by slug", () => {
    const barbell = getEquipmentBySlug("barbell");
    expect(barbell).toBeDefined();
    expect(barbell!.name).toBe("Barbell");
    expect(barbell!.category).toBe("strength");
  });

  it("returns undefined for unknown slug", () => {
    expect(getEquipmentBySlug("nonexistent")).toBeUndefined();
  });
});

describe("resourceSuggestions", () => {
  it("all suggestions have valid slugs that exist in registry", () => {
    for (const suggestion of resourceSuggestions) {
      for (const slug of suggestion.equipment_slugs) {
        expect(getEquipmentBySlug(slug)).toBeDefined();
      }
    }
  });

  it("all suggestions have valid constraints", () => {
    const validConstraints = ["no_superset", "group_together", "needs_setup_change", "never_together"];
    for (const suggestion of resourceSuggestions) {
      expect(validConstraints).toContain(suggestion.constraint);
    }
  });

  it("getApplicableSuggestions returns matches with 2+ overlapping slugs", () => {
    const result = getApplicableSuggestions(["barbell", "squat-rack", "bench-press"]);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((s) => s.resource_name === "Barbell Station")).toBe(true);
  });

  it("getApplicableSuggestions returns empty for no overlap", () => {
    expect(getApplicableSuggestions(["treadmill"])).toHaveLength(0);
  });

  it("getApplicableSuggestions requires at least 2 matching slugs", () => {
    // Only 1 slug from Barbell Station
    expect(getApplicableSuggestions(["barbell"])).toHaveLength(0);
  });
});
