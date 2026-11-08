import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { GroupWorkoutView } from "@/components/workout/group-workout-view";
import type { SavedGroupWorkout } from "@/lib/ai/schemas";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const workout: SavedGroupWorkout = {
  warmup: [{ name: "Arm circles", detail: "30s" }],
  blocks: [
    {
      name: "Block A — Legs",
      format: "straight",
      note: "Swap each slot",
      slots: [
        {
          assignments: [
            { person: 0, name: "Back Squat", sets: "3", reps: "8", rest: "90s", equipment_ids: ["eq-bb"], note: "Brace" },
            { person: 1, name: "Goblet Squat", sets: "3", reps: "10", rest: "60s", equipment_ids: ["eq-db"] },
          ],
        },
        {
          assignments: [
            { person: 0, name: "Goblet Squat", sets: "3", reps: "10", rest: "60s", equipment_ids: ["eq-db"] },
            { person: 1, name: "Air Squat", sets: "3", reps: "15", rest: "45s", equipment_ids: [] },
          ],
        },
      ],
    },
  ],
  cooldown: [{ name: "Quad stretch", detail: "30s" }],
  coaching: ["Drive through heels"],
  person_names: ["Ann", ""],
  equipment_names: { "eq-bb": "Barbell", "eq-db": "Dumbbells" },
};

describe("GroupWorkoutView", () => {
  const onBack = vi.fn();
  const onSave = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it("renders warmup, block, cooldown and coaching", () => {
    render(<GroupWorkoutView workout={workout} groupSize={2} onBack={onBack} />);
    expect(screen.getByText("Warm-Up")).toBeInTheDocument();
    expect(screen.getByText("Arm circles")).toBeInTheDocument();
    expect(screen.getByText("Block A — Legs")).toBeInTheDocument();
    expect(screen.getByText("STRAIGHT SETS")).toBeInTheDocument();
    expect(screen.getByText("Swap each slot")).toBeInTheDocument();
    expect(screen.getByText("Cool-Down")).toBeInTheDocument();
    expect(screen.getByText("Quad stretch")).toBeInTheDocument();
    expect(screen.getByText("Drive through heels")).toBeInTheDocument();
  });

  it("renders each person's exercise per slot", () => {
    render(<GroupWorkoutView workout={workout} groupSize={2} onBack={onBack} />);
    const slot1 = within(screen.getByTestId("slot-0-0"));
    expect(slot1.getByText("Back Squat")).toBeInTheDocument();
    expect(slot1.getByText("Goblet Squat")).toBeInTheDocument();
    const slot2 = within(screen.getByTestId("slot-0-1"));
    expect(slot2.getByText("Air Squat")).toBeInTheDocument();
    expect(screen.getAllByText("Slot 1")).toHaveLength(1);
    expect(screen.getAllByText("Slot 2")).toHaveLength(1);
  });

  it("uses person names with a fallback label", () => {
    render(<GroupWorkoutView workout={workout} groupSize={2} onBack={onBack} />);
    const slot1 = within(screen.getByTestId("slot-0-0"));
    expect(slot1.getByText("Ann")).toBeInTheDocument();
    expect(slot1.getByText("Person 2")).toBeInTheDocument();
  });

  it("shows equipment tags by name and a Bodyweight tag", () => {
    render(<GroupWorkoutView workout={workout} groupSize={2} onBack={onBack} />);
    expect(within(screen.getByTestId("slot-0-0")).getByText("Barbell")).toBeInTheDocument();
    expect(within(screen.getByTestId("slot-0-0")).getByText("Dumbbells")).toBeInTheDocument();
    expect(within(screen.getByTestId("slot-0-1")).getByText("Bodyweight")).toBeInTheDocument();
  });

  it("falls back to the raw id when no name is known", () => {
    render(
      <GroupWorkoutView workout={{ ...workout, equipment_names: undefined }} groupSize={2} onBack={onBack} />
    );
    expect(within(screen.getByTestId("slot-0-0")).getByText("eq-bb")).toBeInTheDocument();
  });

  it("stacks on mobile and uses columns from sm up", () => {
    render(<GroupWorkoutView workout={workout} groupSize={2} onBack={onBack} />);
    const grid = screen.getAllByTestId("person-0")[0].parentElement!;
    expect(grid.className).toContain("grid-cols-1");
    expect(grid.className).toContain("sm:grid-cols-2");
  });

  it("renders a card per person for 6 people, tolerating missing assignments", () => {
    render(<GroupWorkoutView workout={workout} groupSize={6} onBack={onBack} />);
    expect(screen.getAllByTestId(/^person-/)).toHaveLength(12);
  });

  it("shows loading state", () => {
    render(<GroupWorkoutView workout={null} groupSize={2} isLoading onBack={onBack} />);
    expect(screen.getByText("Designing a conflict-free plan…")).toBeInTheDocument();
  });

  it("shows the error, violations and a Try Again button", () => {
    render(
      <GroupWorkoutView
        workout={null}
        groupSize={2}
        error="Couldn't build a conflict-free group workout"
        violations={["Block 1 (\"A\"), slot 1: Barbell used by 2 people"]}
        onBack={onBack}
      />
    );
    expect(screen.getByText("Couldn't build a conflict-free group workout")).toBeInTheDocument();
    expect(screen.getByText(/Barbell used by 2 people/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Try Again"));
    expect(onBack).toHaveBeenCalled();
  });

  it("calls onSave from the Save button", () => {
    render(<GroupWorkoutView workout={workout} groupSize={2} onSave={onSave} onBack={onBack} />);
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalled();
  });

  it("does not render Save without onSave", () => {
    render(<GroupWorkoutView workout={workout} groupSize={2} onBack={onBack} />);
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("copies a plain-text plan", () => {
    render(<GroupWorkoutView workout={workout} groupSize={2} onBack={onBack} />);
    fireEvent.click(screen.getByText("Copy"));
    const text = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(text).toContain("Ann: Back Squat");
    expect(text).toContain("[Barbell]");
    expect(text).toContain("[Bodyweight]");
  });

  it("embedded mode hides back button and the action bar", () => {
    render(<GroupWorkoutView workout={workout} groupSize={2} onSave={onSave} onBack={onBack} embedded />);
    expect(screen.queryByText("Back")).not.toBeInTheDocument();
    expect(screen.queryByText("Copy")).not.toBeInTheDocument();
    expect(screen.getByText("Block A — Legs")).toBeInTheDocument();
  });

  it("renders nothing without a workout", () => {
    const { container } = render(<GroupWorkoutView workout={null} groupSize={2} onBack={onBack} />);
    expect(container).toBeEmptyDOMElement();
  });
});
