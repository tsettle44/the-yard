import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Workout } from "@/types/workout";
import { makeWorkout } from "../fixtures";

const mockWorkouts: { current: Workout[] } = { current: [] };
vi.mock("@/hooks/use-workouts", () => ({
  useWorkouts: () => ({
    workouts: mockWorkouts.current,
    deleteWorkout: vi.fn(),
    rateWorkout: vi.fn(),
    hydrated: true,
    loading: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import HistoryPage from "@/app/(app)/history/page";

const groupStructured = {
  warmup: [],
  blocks: [
    {
      name: "Block A",
      format: "straight",
      slots: [
        {
          assignments: [
            { person: 0, name: "Back Squat", sets: "3", reps: "8", rest: "90s", equipment_ids: ["bb"] },
            { person: 1, name: "Push-up", sets: "3", reps: "12", rest: "60s", equipment_ids: [] },
          ],
        },
      ],
    },
  ],
  cooldown: [],
  coaching: [],
  equipment_names: { bb: "Barbell" },
};

describe("HistoryPage with group workouts", () => {
  it("renders a saved group workout with the group view", () => {
    mockWorkouts.current = [
      makeWorkout({
        parameters: { group_size: 2 },
        structured: groupStructured as unknown as Workout["structured"],
      }),
    ];
    render(<HistoryPage />);
    expect(screen.getByText("Group ×2")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/strength/i));
    expect(screen.getByText("Back Squat")).toBeInTheDocument();
    expect(screen.getByText("Push-up")).toBeInTheDocument();
    expect(screen.getByText("Barbell")).toBeInTheDocument();
  });

  it("does not crash on malformed group structured data", () => {
    mockWorkouts.current = [
      makeWorkout({
        parameters: { group_size: 3 },
        content: "raw text",
        structured: { blocks: [{ name: "x", exercises: [] }] } as unknown as Workout["structured"],
      }),
    ];
    render(<HistoryPage />);
    fireEvent.click(screen.getByText(/strength/i));
    expect(screen.getByText("Group ×3")).toBeInTheDocument();
  });

  it("still renders solo workouts with the solo view", () => {
    mockWorkouts.current = [
      makeWorkout({
        structured: {
          warmup: [],
          blocks: [
            {
              name: "Solo Block",
              format: "straight",
              exercises: [{ name: "Bench Press", sets: "3", reps: "10", rest: "60s" }],
            },
          ],
          cooldown: [],
          coaching: [],
        },
      }),
    ];
    render(<HistoryPage />);
    fireEvent.click(screen.getByText(/strength/i));
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.queryByText(/Group ×/)).not.toBeInTheDocument();
  });
});
