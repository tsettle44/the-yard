import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGroupWorkout } from "@/hooks/use-group-workout";
import type { GenerateGroupWorkoutRequest } from "@/types/workout";

const request: GenerateGroupWorkoutRequest = {
  profile_id: "p1",
  gym_id: "g1",
  style: "strength",
  duration_min: 45,
  target_rpe: 7,
  body_groups: ["full_body"],
  parameters: {},
  group_size: 3,
};

const plan = { warmup: [], blocks: [], cooldown: [], coaching: [] };

describe("useGroupWorkout", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts to the group endpoint and stores the workout", async () => {
    fetchMock.mockResolvedValue(Response.json({ workout: plan }));
    const { result } = renderHook(() => useGroupWorkout());
    await act(async () => {
      await result.current.generate({ request, equipmentData: [], layoutNotes: "x" });
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/workout/generate-group");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.group_size).toBe(3);
    expect(body.layout_notes).toBe("x");
    expect(result.current.workout).toEqual(plan);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("exposes error and violations on a 422", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: "Conflicts", violations: ["v1", "v2"] }, { status: 422 })
    );
    const { result } = renderHook(() => useGroupWorkout());
    await act(async () => {
      await result.current.generate({ request });
    });
    expect(result.current.workout).toBeNull();
    expect(result.current.error).toBe("Conflicts");
    expect(result.current.violations).toEqual(["v1", "v2"]);
  });

  it("surfaces network failures", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useGroupWorkout());
    await act(async () => {
      await result.current.generate({ request });
    });
    expect(result.current.error).toBe("offline");
  });

  it("errors when the response has no workout", async () => {
    fetchMock.mockResolvedValue(Response.json({}));
    const { result } = renderHook(() => useGroupWorkout());
    await act(async () => {
      await result.current.generate({ request });
    });
    expect(result.current.error).toBe("No workout returned");
  });

  it("reset clears state", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: "bad", violations: ["v"] }, { status: 422 }));
    const { result } = renderHook(() => useGroupWorkout());
    await act(async () => {
      await result.current.generate({ request });
    });
    act(() => result.current.reset());
    expect(result.current.error).toBeNull();
    expect(result.current.violations).toEqual([]);
    expect(result.current.workout).toBeNull();
  });
});
