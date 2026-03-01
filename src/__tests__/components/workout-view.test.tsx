import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkoutView } from "@/components/workout/workout-view";

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("WorkoutView", () => {
  const defaultWorkout = {
    warmup: [{ name: "Arm circles", detail: "30s" }],
    blocks: [
      {
        name: "Block A — Chest",
        format: "straight" as const,
        exercises: [
          { name: "Bench Press", sets: "3", reps: "10", rest: "90s", note: "Control descent" },
        ],
      },
    ],
    cooldown: [{ name: "Stretch", detail: "5 min" }],
    coaching: ["Focus on form"],
  };

  const onBack = vi.fn();
  const onSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders warmup section", () => {
    render(<WorkoutView workout={defaultWorkout} isStreaming={false} error={null} onBack={onBack} />);
    expect(screen.getByText("Warm-Up")).toBeInTheDocument();
    expect(screen.getByText("Arm circles")).toBeInTheDocument();
    expect(screen.getByText("30s")).toBeInTheDocument();
  });

  it("renders block with name and format", () => {
    render(<WorkoutView workout={defaultWorkout} isStreaming={false} error={null} onBack={onBack} />);
    expect(screen.getByText("Block A — Chest")).toBeInTheDocument();
    expect(screen.getByText("STRAIGHT SETS")).toBeInTheDocument();
  });

  it("renders exercise details", () => {
    render(<WorkoutView workout={defaultWorkout} isStreaming={false} error={null} onBack={onBack} />);
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("90s")).toBeInTheDocument();
  });

  it("renders exercise note", () => {
    render(<WorkoutView workout={defaultWorkout} isStreaming={false} error={null} onBack={onBack} />);
    expect(screen.getByText("Control descent")).toBeInTheDocument();
  });

  it("renders cooldown section", () => {
    render(<WorkoutView workout={defaultWorkout} isStreaming={false} error={null} onBack={onBack} />);
    expect(screen.getByText("Cool-Down")).toBeInTheDocument();
    expect(screen.getByText("Stretch")).toBeInTheDocument();
  });

  it("renders coaching section", () => {
    render(<WorkoutView workout={defaultWorkout} isStreaming={false} error={null} onBack={onBack} />);
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Focus on form")).toBeInTheDocument();
  });

  it("renders format labels correctly", () => {
    const workout = {
      ...defaultWorkout,
      blocks: [
        { name: "Superset", format: "superset" as const, exercises: [{ name: "Ex", sets: "3", reps: "10", rest: "60s" }] },
      ],
    };
    render(<WorkoutView workout={workout} isStreaming={false} error={null} onBack={onBack} />);
    expect(screen.getByText("SUPERSET")).toBeInTheDocument();
  });

  it("shows streaming spinner", () => {
    render(<WorkoutView workout={null} isStreaming={true} error={null} onBack={onBack} />);
    // Loader should be present
    expect(screen.getByText("Building...")).toBeInTheDocument();
  });

  it("shows loading indicator when streaming with content", () => {
    render(<WorkoutView workout={defaultWorkout} isStreaming={true} error={null} onBack={onBack} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows error state", () => {
    render(<WorkoutView workout={null} isStreaming={false} error="Something failed" onBack={onBack} />);
    expect(screen.getByText("Something failed")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("calls onBack when back button clicked", () => {
    render(<WorkoutView workout={defaultWorkout} isStreaming={false} error={null} onBack={onBack} />);
    fireEvent.click(screen.getByText("Back"));
    expect(onBack).toHaveBeenCalled();
  });

  it("shows copy button when complete", () => {
    render(<WorkoutView workout={defaultWorkout} isStreaming={false} error={null} onBack={onBack} />);
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("shows save button when onSave provided", () => {
    render(<WorkoutView workout={defaultWorkout} isStreaming={false} error={null} onBack={onBack} onSave={onSave} />);
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("copies to clipboard on copy click", async () => {
    render(<WorkoutView workout={defaultWorkout} isStreaming={false} error={null} onBack={onBack} />);
    fireEvent.click(screen.getByText("Copy"));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("calls onSave when save clicked", () => {
    render(<WorkoutView workout={defaultWorkout} isStreaming={false} error={null} onBack={onBack} onSave={onSave} />);
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalled();
  });

  it("does not show actions while streaming", () => {
    render(<WorkoutView workout={defaultWorkout} isStreaming={true} error={null} onBack={onBack} onSave={onSave} />);
    expect(screen.queryByText("Copy")).not.toBeInTheDocument();
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("handles partial workout data", () => {
    const partial = { warmup: [{ name: "Jog", detail: "5 min" }] };
    render(<WorkoutView workout={partial} isStreaming={true} error={null} onBack={onBack} />);
    expect(screen.getByText("Jog")).toBeInTheDocument();
  });

  it("handles empty workout", () => {
    render(<WorkoutView workout={{}} isStreaming={true} error={null} onBack={onBack} />);
    // Should show spinner placeholder
    expect(document.querySelector('[class*="animate-spin"]')).toBeInTheDocument();
  });

  it("renders placeholder text for missing exercise fields", () => {
    const workout = {
      blocks: [
        {
          name: "Block A",
          format: "straight" as const,
          exercises: [{ name: "", sets: "", reps: "", rest: "" }],
        },
      ],
    };
    render(<WorkoutView workout={workout} isStreaming={true} error={null} onBack={onBack} />);
    // Should render "--" placeholders
    const placeholders = screen.getAllByText("--");
    expect(placeholders.length).toBeGreaterThanOrEqual(3);
  });
});
