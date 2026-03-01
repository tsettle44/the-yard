import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkoutForm } from "@/components/workout/workout-form";

function getSubmitButton() {
  return screen.getByRole("button", { name: /Generate Workout/i });
}

function getForm() {
  return getSubmitButton().closest("form")!;
}

describe("WorkoutForm", () => {
  const defaultProps = {
    profileId: "p1",
    gymId: "g1",
    guestMode: false,
    onGenerate: vi.fn(),
    isStreaming: false,
  };

  it("renders style selection buttons", () => {
    render(<WorkoutForm {...defaultProps} />);
    expect(screen.getByText("Strength")).toBeInTheDocument();
    expect(screen.getByText("HIIT")).toBeInTheDocument();
    expect(screen.getByText("Circuit")).toBeInTheDocument();
  });

  it("renders duration options", () => {
    render(<WorkoutForm {...defaultProps} />);
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
  });

  it("renders RPE options", () => {
    render(<WorkoutForm {...defaultProps} />);
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it("renders body group options", () => {
    render(<WorkoutForm {...defaultProps} />);
    expect(screen.getByText("Full Body")).toBeInTheDocument();
    expect(screen.getByText("Chest")).toBeInTheDocument();
    expect(screen.getByText("Back")).toBeInTheDocument();
  });

  it("renders option checkboxes (supersets, circuits, dropsets)", () => {
    render(<WorkoutForm {...defaultProps} />);
    expect(screen.getByText("Supersets")).toBeInTheDocument();
    expect(screen.getByText("Circuits")).toBeInTheDocument();
    expect(screen.getByText("Drop Sets")).toBeInTheDocument();
  });

  it("renders instructions textarea", () => {
    render(<WorkoutForm {...defaultProps} />);
    expect(screen.getByLabelText("Instructions")).toBeInTheDocument();
  });

  it("updates style and defaults when selecting style", async () => {
    const onGenerate = vi.fn();
    render(<WorkoutForm {...defaultProps} onGenerate={onGenerate} />);
    const user = userEvent.setup();

    await user.click(screen.getByText("HIIT"));
    fireEvent.submit(getForm());

    expect(onGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ style: "hiit" })
    );
  });

  it("full_body is exclusive (deselects other groups)", async () => {
    const onGenerate = vi.fn();
    render(<WorkoutForm {...defaultProps} onGenerate={onGenerate} />);
    const user = userEvent.setup();

    await user.click(screen.getByText("Chest"));
    await user.click(screen.getByText("Full Body"));
    fireEvent.submit(getForm());

    expect(onGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ body_groups: ["full_body"] })
    );
  });

  it("selecting specific group deselects full_body", async () => {
    const onGenerate = vi.fn();
    render(<WorkoutForm {...defaultProps} onGenerate={onGenerate} />);
    const user = userEvent.setup();

    await user.click(screen.getByText("Chest"));
    fireEvent.submit(getForm());

    expect(onGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ body_groups: ["chest"] })
    );
  });

  it("reverts to full_body when all groups deselected", async () => {
    const onGenerate = vi.fn();
    render(<WorkoutForm {...defaultProps} onGenerate={onGenerate} />);
    const user = userEvent.setup();

    await user.click(screen.getByText("Chest"));
    await user.click(screen.getByText("Chest"));
    fireEvent.submit(getForm());

    expect(onGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ body_groups: ["full_body"] })
    );
  });

  it("disables submit when no gymId", () => {
    render(<WorkoutForm {...defaultProps} gymId={null} />);
    expect(getSubmitButton()).toBeDisabled();
  });

  it("disables submit when no profileId and not guest mode", () => {
    render(<WorkoutForm {...defaultProps} profileId={null} guestMode={false} />);
    expect(getSubmitButton()).toBeDisabled();
  });

  it("enables submit in guest mode without profileId", () => {
    render(<WorkoutForm {...defaultProps} profileId={null} guestMode={true} />);
    expect(getSubmitButton()).not.toBeDisabled();
  });

  it("disables submit while streaming", () => {
    render(<WorkoutForm {...defaultProps} isStreaming={true} />);
    expect(screen.getByRole("button", { name: /Generating/i })).toBeDisabled();
  });

  it("submits correct payload", async () => {
    const onGenerate = vi.fn();
    render(<WorkoutForm {...defaultProps} onGenerate={onGenerate} />);

    fireEvent.submit(getForm());

    expect(onGenerate).toHaveBeenCalledWith({
      profile_id: "p1",
      gym_id: "g1",
      style: "strength",
      duration_min: 45,
      target_rpe: 7,
      body_groups: ["full_body"],
      parameters: {},
    });
  });

  it("guest mode sends null profile_id", async () => {
    const onGenerate = vi.fn();
    render(<WorkoutForm {...defaultProps} profileId={null} guestMode={true} onGenerate={onGenerate} />);

    fireEvent.submit(getForm());

    expect(onGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ profile_id: null })
    );
  });

  it("shows guest mode notice", () => {
    render(<WorkoutForm {...defaultProps} profileId={null} guestMode={true} />);
    expect(screen.getByText(/Generating as guest/)).toBeInTheDocument();
  });

  it("shows no profile notice", () => {
    render(<WorkoutForm {...defaultProps} profileId={null} guestMode={false} />);
    expect(screen.getByText(/create and select a profile/)).toBeInTheDocument();
  });

  it("shows no gym notice", () => {
    render(<WorkoutForm {...defaultProps} gymId={null} />);
    expect(screen.getByText(/create and configure a gym/)).toBeInTheDocument();
  });
});
