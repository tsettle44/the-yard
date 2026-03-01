import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// We need to test tryParsePartialJson. Since it's not exported,
// we'll test it indirectly through the hook or extract and test the logic.
// For direct testing, let's import the module and test the function via the hook's behavior.

// For partial JSON tests, we'll inline the logic since it's not exported
function tryParsePartialJson(raw: string): Record<string, unknown> | null {
  if (!raw.trim()) return null;
  let attempt = raw.trim();
  try { return JSON.parse(attempt); } catch { /* continue */ }
  attempt = attempt.replace(/,\s*$/, "");
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (let i = 0; i < attempt.length; i++) {
    const ch = attempt[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inString) attempt += '"';
  attempt = attempt.replace(/,?\s*"[^"]*"\s*:\s*$/, "");
  attempt = attempt.replace(/,\s*$/, "");
  // Remove trailing commas before closing brackets/braces (e.g. `,]` or `,}`)
  attempt = attempt.replace(/,\s*(?=[}\]])/g, "");
  while (stack.length > 0) attempt += stack.pop();
  try { return JSON.parse(attempt); } catch { return null; }
}

describe("tryParsePartialJson", () => {
  it("parses complete JSON", () => {
    expect(tryParsePartialJson('{"warmup": []}')).toEqual({ warmup: [] });
  });

  it("returns null for empty string", () => {
    expect(tryParsePartialJson("")).toBeNull();
  });

  it("repairs unclosed braces", () => {
    const result = tryParsePartialJson('{"warmup": [{"name": "Jog", "detail": "5 min"}]');
    expect(result).not.toBeNull();
    expect(result?.warmup).toBeDefined();
  });

  it("repairs unclosed brackets", () => {
    const result = tryParsePartialJson('{"warmup": [{"name": "Jog", "detail": "5 min"}');
    expect(result).not.toBeNull();
  });

  it("repairs unclosed strings", () => {
    const result = tryParsePartialJson('{"warmup": [{"name": "Jo');
    expect(result).not.toBeNull();
  });

  it("removes trailing commas", () => {
    const result = tryParsePartialJson('{"warmup": [{"name": "Jog", "detail": "5 min"},]');
    // Should still parse after removing trailing comma and closing
    expect(result).not.toBeNull();
  });

  it("removes trailing incomplete key-value pairs", () => {
    const result = tryParsePartialJson('{"warmup": [{"name": "Jog", "detail": ');
    expect(result).not.toBeNull();
  });

  it("handles nested partial objects", () => {
    const result = tryParsePartialJson('{"blocks": [{"name": "Block A", "exercises": [{"name": "Squat"');
    expect(result).not.toBeNull();
  });

  it("handles escaped characters in strings", () => {
    const result = tryParsePartialJson('{"note": "Use \\"proper\\" form"}');
    expect(result).toEqual({ note: 'Use "proper" form' });
  });

  it("returns null for impossible repair", () => {
    // Garbage that can't be repaired
    expect(tryParsePartialJson("not json at all")).toBeNull();
  });

  it("handles deeply nested cutoff", () => {
    const result = tryParsePartialJson('{"blocks": [{"exercises": [{"sets": "3", "reps": "10"');
    expect(result).not.toBeNull();
  });

  it("handles string values containing JSON chars", () => {
    const result = tryParsePartialJson('{"note": "Use {brackets} and [arrays]"}');
    expect(result).toEqual({ note: "Use {brackets} and [arrays]" });
  });
});

// Hook tests using the actual import
import { useWorkoutStream } from "@/hooks/use-workout-stream";

describe("useWorkoutStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("has correct initial state", () => {
    const { result } = renderHook(() => useWorkoutStream());
    expect(result.current.workout).toBeNull();
    expect(result.current.rawJson).toBe("");
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("resets state", () => {
    const { result } = renderHook(() => useWorkoutStream());
    act(() => {
      result.current.reset();
    });
    expect(result.current.workout).toBeNull();
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles fetch error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Server error" }), { status: 500 })
    );

    const { result } = renderHook(() => useWorkoutStream());

    await act(async () => {
      await result.current.generate({
        request: {
          profile_id: "p1",
          gym_id: "g1",
          style: "strength",
          duration_min: 60,
          target_rpe: 7,
          body_groups: ["chest"],
          parameters: {},
        },
      });
    });

    expect(result.current.error).toBe("Server error");
    expect(result.current.isStreaming).toBe(false);
  });

  it("handles network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useWorkoutStream());

    await act(async () => {
      await result.current.generate({
        request: {
          profile_id: "p1",
          gym_id: "g1",
          style: "strength",
          duration_min: 60,
          target_rpe: 7,
          body_groups: ["chest"],
          parameters: {},
        },
      });
    });

    expect(result.current.error).toBe("Network error");
  });
});
