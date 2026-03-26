import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrainingPlanForm } from "@/components/training-plan/training-plan-form";
import { Equipment } from "@/types/gym";

const mockEquipment: Equipment[] = [
  { id: "e1", gym_id: "g1", slug: "barbell", name: "Barbell", category: "strength", attributes: {}, quantity: 1 },
  { id: "e2", gym_id: "g1", slug: "dumbbells", name: "Dumbbells", category: "strength", attributes: {}, quantity: 2 },
  { id: "e3", gym_id: "g1", slug: "treadmill", name: "Treadmill", category: "cardio", attributes: {}, quantity: 1 },
];

function getNextButton() {
  return screen.getByRole("button", { name: /Next/i });
}

describe("TrainingPlanForm", () => {
  const defaultProps = {
    onGenerate: vi.fn(),
    isStreaming: false,
    equipment: mockEquipment,
  };

  describe("Step 1 - Event Details", () => {
    it("renders event type buttons", () => {
      render(<TrainingPlanForm {...defaultProps} />);
      expect(screen.getByText("Marathon")).toBeInTheDocument();
      expect(screen.getByText("Hyrox")).toBeInTheDocument();
      expect(screen.getByText("Triathlon")).toBeInTheDocument();
      expect(screen.getByText("5K")).toBeInTheDocument();
    });

    it("renders event name input", () => {
      render(<TrainingPlanForm {...defaultProps} />);
      expect(screen.getByLabelText("Event Name")).toBeInTheDocument();
    });

    it("renders event date input", () => {
      render(<TrainingPlanForm {...defaultProps} />);
      expect(screen.getByLabelText("Event Date")).toBeInTheDocument();
    });

    it("shows step indicator 1/4", () => {
      render(<TrainingPlanForm {...defaultProps} />);
      expect(screen.getByText("1 / 4")).toBeInTheDocument();
    });

    it("disables Next when event name is empty", () => {
      render(<TrainingPlanForm {...defaultProps} />);
      expect(getNextButton()).toBeDisabled();
    });

    it("enables Next when all step 1 fields filled", async () => {
      render(<TrainingPlanForm {...defaultProps} />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText("Event Name"), "Chicago Marathon");
      // Set the date input
      fireEvent.change(screen.getByLabelText("Event Date"), { target: { value: "2026-10-11" } });

      expect(getNextButton()).not.toBeDisabled();
    });
  });

  describe("Step 2 - Experience", () => {
    async function goToStep2() {
      render(<TrainingPlanForm {...defaultProps} />);
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Event Name"), "Test Race");
      fireEvent.change(screen.getByLabelText("Event Date"), { target: { value: "2026-10-11" } });
      await user.click(getNextButton());
    }

    it("renders experience level options", async () => {
      await goToStep2();
      expect(screen.getByText("Beginner")).toBeInTheDocument();
      expect(screen.getByText("Intermediate")).toBeInTheDocument();
      expect(screen.getByText("Advanced")).toBeInTheDocument();
      expect(screen.getByText("Elite")).toBeInTheDocument();
    });

    it("renders current fitness textarea", async () => {
      await goToStep2();
      expect(screen.getByLabelText("Current Fitness Level")).toBeInTheDocument();
    });

    it("shows step indicator 2/4", async () => {
      await goToStep2();
      expect(screen.getByText("2 / 4")).toBeInTheDocument();
    });

    it("shows Back button on step 2", async () => {
      await goToStep2();
      expect(screen.getByRole("button", { name: /Back/i })).toBeInTheDocument();
    });

    it("goes back to step 1 when Back clicked", async () => {
      await goToStep2();
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /Back/i }));
      expect(screen.getByText("1 / 4")).toBeInTheDocument();
    });
  });

  describe("Step 3 - Schedule", () => {
    async function goToStep3() {
      render(<TrainingPlanForm {...defaultProps} />);
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Event Name"), "Test Race");
      fireEvent.change(screen.getByLabelText("Event Date"), { target: { value: "2026-10-11" } });
      await user.click(getNextButton());
      await user.click(getNextButton());
    }

    it("renders day selection buttons", async () => {
      await goToStep3();
      expect(screen.getByText("Mon")).toBeInTheDocument();
      expect(screen.getByText("Tue")).toBeInTheDocument();
      expect(screen.getByText("Sun")).toBeInTheDocument();
    });

    it("renders time per session buttons", async () => {
      await goToStep3();
      expect(screen.getByText("0.5")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("shows day count", async () => {
      await goToStep3();
      expect(screen.getByText(/4 days selected/i)).toBeInTheDocument();
    });

    it("toggles day selection", async () => {
      await goToStep3();
      const user = userEvent.setup();
      // Deselect Monday (default selected)
      await user.click(screen.getByText("Mon"));
      expect(screen.getByText(/3 days selected/i)).toBeInTheDocument();
    });
  });

  describe("Step 4 - Details", () => {
    async function goToStep4() {
      render(<TrainingPlanForm {...defaultProps} />);
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Event Name"), "Test Race");
      fireEvent.change(screen.getByLabelText("Event Date"), { target: { value: "2026-10-11" } });
      await user.click(getNextButton()); // to step 2
      await user.click(getNextButton()); // to step 3
      await user.click(getNextButton()); // to step 4
    }

    it("renders goals textarea", async () => {
      await goToStep4();
      expect(screen.getByLabelText("Goals")).toBeInTheDocument();
    });

    it("renders injuries textarea", async () => {
      await goToStep4();
      expect(screen.getByLabelText("Injuries or Limitations")).toBeInTheDocument();
    });

    it("renders additional notes textarea", async () => {
      await goToStep4();
      expect(screen.getByLabelText("Additional Notes")).toBeInTheDocument();
    });

    it("displays equipment from gym settings", async () => {
      await goToStep4();
      expect(screen.getByText(/Barbell/)).toBeInTheDocument();
      expect(screen.getByText(/Dumbbells x2/)).toBeInTheDocument();
      expect(screen.getByText(/Treadmill/)).toBeInTheDocument();
    });

    it("shows equipment management hint", async () => {
      await goToStep4();
      expect(screen.getByText(/Manage equipment in Settings/)).toBeInTheDocument();
    });

    it("does not show equipment section when no equipment", async () => {
      render(<TrainingPlanForm {...defaultProps} equipment={[]} />);
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Event Name"), "Test Race");
      fireEvent.change(screen.getByLabelText("Event Date"), { target: { value: "2026-10-11" } });
      await user.click(getNextButton());
      await user.click(getNextButton());
      await user.click(getNextButton());
      expect(screen.queryByText(/from Settings/)).not.toBeInTheDocument();
    });

    it("shows Generate button on last step", async () => {
      await goToStep4();
      expect(screen.getByRole("button", { name: /Generate Training Plan/i })).toBeInTheDocument();
    });

    it("submits correct payload", async () => {
      const onGenerate = vi.fn();
      render(<TrainingPlanForm {...defaultProps} onGenerate={onGenerate} />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText("Event Name"), "Test Race");
      fireEvent.change(screen.getByLabelText("Event Date"), { target: { value: "2026-10-11" } });
      await user.click(getNextButton()); // to step 2
      await user.click(getNextButton()); // to step 3
      await user.click(getNextButton()); // to step 4
      await user.click(screen.getByRole("button", { name: /Generate Training Plan/i }));

      expect(onGenerate).toHaveBeenCalledWith({
        event_type: "marathon",
        event_name: "Test Race",
        event_date: "2026-10-11",
        experience_level: "intermediate",
        available_days: ["monday", "wednesday", "friday", "saturday"],
        hours_per_day: 1,
        goals: "",
        current_fitness: "",
        injuries_limitations: "",
        additional_notes: "",
      });
    });
  });

  describe("Streaming state", () => {
    it("disables buttons while streaming", () => {
      render(<TrainingPlanForm {...defaultProps} isStreaming={true} />);
      expect(screen.getByRole("button", { name: /Generating Plan/i })).toBeDisabled();
    });
  });
});
