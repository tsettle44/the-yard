import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { makeWorkout } from "../fixtures";

vi.mock("@/lib/config", () => ({
  config: {
    get isHosted() { return false; },
    get isSelfHosted() { return true; },
  },
}));

import { useWorkouts } from "@/hooks/use-workouts";

describe("useWorkouts — Self-hosted", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("starts with empty workouts", () => {
    const { result } = renderHook(() => useWorkouts());
    expect(result.current.workouts).toEqual([]);
  });

  it("adds a workout (prepends)", () => {
    const { result } = renderHook(() => useWorkouts());
    const workout = makeWorkout({ id: "w1" });
    act(() => {
      result.current.addWorkout(workout);
    });
    expect(result.current.workouts).toHaveLength(1);
    expect(result.current.workouts[0].id).toBe("w1");

    const workout2 = makeWorkout({ id: "w2" });
    act(() => {
      result.current.addWorkout(workout2);
    });
    expect(result.current.workouts[0].id).toBe("w2"); // prepended
  });

  it("deletes a workout", () => {
    const { result } = renderHook(() => useWorkouts());
    const workout = makeWorkout({ id: "w1" });
    act(() => {
      result.current.addWorkout(workout);
    });
    act(() => {
      result.current.deleteWorkout("w1");
    });
    expect(result.current.workouts).toHaveLength(0);
  });

  it("rates a workout", () => {
    const { result } = renderHook(() => useWorkouts());
    const workout = makeWorkout({ id: "w1" });
    act(() => {
      result.current.addWorkout(workout);
    });
    act(() => {
      result.current.rateWorkout("w1", 5);
    });
    expect(result.current.workouts[0].rating).toBe(5);
  });

  it("is not loading in self-hosted mode", () => {
    const { result } = renderHook(() => useWorkouts());
    expect(result.current.loading).toBe(false);
  });
});
