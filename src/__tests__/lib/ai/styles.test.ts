import { describe, it, expect } from "vitest";
import { workoutStyles, getStyleBySlug } from "@/lib/ai/styles";

describe("workoutStyles", () => {
  it("has all 9 styles", () => {
    expect(workoutStyles).toHaveLength(9);
  });

  it("all slugs are unique", () => {
    const slugs = workoutStyles.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("all styles have default values", () => {
    for (const style of workoutStyles) {
      expect(style.defaultDuration).toBeGreaterThan(0);
      expect(style.defaultRpe).toBeGreaterThan(0);
      expect(style.name).toBeTruthy();
      expect(style.description).toBeTruthy();
    }
  });

  it("getStyleBySlug returns correct style", () => {
    const strength = getStyleBySlug("strength");
    expect(strength).toBeDefined();
    expect(strength!.name).toBe("Strength");
    expect(strength!.defaultDuration).toBe(60);
  });

  it("getStyleBySlug returns undefined for unknown", () => {
    expect(getStyleBySlug("yoga" as never)).toBeUndefined();
  });
});
