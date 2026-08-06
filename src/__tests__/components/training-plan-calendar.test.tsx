import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TrainingPlanCalendar } from "@/components/training-plan/training-plan-calendar";
import type { TrainingPlanOutputType } from "@/lib/ai/training-plan-schemas";

const mockPlan: Partial<TrainingPlanOutputType> = {
  plan_name: "Marathon Training Plan",
  event_type: "marathon",
  event_date: "2026-10-11",
  total_weeks: 16,
  overview: "A progressive 16-week plan building to your marathon.",
  phases: [
    { name: "Base", weeks: "Weeks 1-4", description: "Build aerobic base" },
    { name: "Build", weeks: "Weeks 5-12", description: "Increase volume" },
  ],
  weeks: [
    {
      week_number: 1,
      phase: "Base Building",
      focus: "Easy aerobic base",
      sessions: [
        {
          date: "2026-07-06",
          day_of_week: "Monday",
          title: "Easy Run",
          type: "run",
          duration_minutes: 30,
          description: "Easy pace run to build base",
          intensity: "easy",
          details: ["Run at conversational pace", "Heart rate zone 2"],
        },
        {
          date: "2026-07-08",
          day_of_week: "Wednesday",
          title: "Tempo Run",
          type: "run",
          duration_minutes: 45,
          description: "Moderate tempo effort",
          intensity: "moderate",
          details: ["10 min warmup", "25 min tempo", "10 min cooldown"],
        },
        {
          date: "2026-07-10",
          day_of_week: "Friday",
          title: "Strength Training",
          type: "strength",
          duration_minutes: 45,
          description: "Full body strength session",
          intensity: "moderate",
          details: ["Squats 3x10", "Lunges 3x12", "Planks 3x30s"],
        },
      ],
    },
  ],
  race_day_tips: ["Start slow", "Stay hydrated", "Trust your training"],
  notes: ["Listen to your body", "Adjust pace as needed"],
};

describe("TrainingPlanCalendar", () => {
  const defaultProps = {
    plan: mockPlan,
    isStreaming: false,
    error: null,
    onBack: vi.fn(),
    onExport: vi.fn(),
  };

  it("renders plan name", () => {
    render(<TrainingPlanCalendar {...defaultProps} />);
    expect(screen.getByText("Marathon Training Plan")).toBeInTheDocument();
  });

  it("renders plan overview", () => {
    render(<TrainingPlanCalendar {...defaultProps} />);
    expect(screen.getByText(/progressive 16-week plan/)).toBeInTheDocument();
  });

  it("renders phase badges", () => {
    render(<TrainingPlanCalendar {...defaultProps} />);
    expect(screen.getByText(/Base: Weeks 1-4/)).toBeInTheDocument();
    expect(screen.getByText(/Build: Weeks 5-12/)).toBeInTheDocument();
  });

  it("renders calendar day headers", () => {
    render(<TrainingPlanCalendar {...defaultProps} />);
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Tue")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
  });

  it("renders Back button", () => {
    render(<TrainingPlanCalendar {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Back/i })).toBeInTheDocument();
  });

  it("calls onBack when Back clicked", () => {
    const onBack = vi.fn();
    render(<TrainingPlanCalendar {...defaultProps} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it("renders Export iCal button when not streaming", () => {
    render(<TrainingPlanCalendar {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Export iCal/i })).toBeInTheDocument();
  });

  it("calls onExport when export clicked", () => {
    const onExport = vi.fn();
    render(<TrainingPlanCalendar {...defaultProps} onExport={onExport} />);
    fireEvent.click(screen.getByRole("button", { name: /Export iCal/i }));
    expect(onExport).toHaveBeenCalled();
  });

  it("hides export button while streaming", () => {
    render(<TrainingPlanCalendar {...defaultProps} isStreaming={true} />);
    expect(screen.queryByRole("button", { name: /Export iCal/i })).not.toBeInTheDocument();
  });

  it("shows session details when clicking a session day", () => {
    render(<TrainingPlanCalendar {...defaultProps} />);
    // Find and click a cell with a session - the Easy Run session on July 6
    const sessionCells = screen.getAllByText(/Easy Run/i);
    fireEvent.click(sessionCells[0].closest("[class*=cursor-pointer]")!);
    // Detail card should appear
    expect(screen.getByText("Easy pace run to build base")).toBeInTheDocument();
    expect(screen.getByText("Run at conversational pace")).toBeInTheDocument();
    expect(screen.getByText("Heart rate zone 2")).toBeInTheDocument();
  });

  it("renders race day tips when not streaming", () => {
    render(<TrainingPlanCalendar {...defaultProps} />);
    expect(screen.getByText("Start slow")).toBeInTheDocument();
    expect(screen.getByText("Stay hydrated")).toBeInTheDocument();
  });

  it("renders important notes when not streaming", () => {
    render(<TrainingPlanCalendar {...defaultProps} />);
    expect(screen.getByText("Listen to your body")).toBeInTheDocument();
  });

  it("shows loading state when streaming without weeks", () => {
    render(
      <TrainingPlanCalendar
        plan={{ plan_name: "My Plan", overview: "Building..." }}
        isStreaming={true}
        error={null}
        onBack={vi.fn()}
        onExport={vi.fn()}
      />
    );
    expect(screen.getByText(/Creating: My Plan/)).toBeInTheDocument();
  });

  it("shows generic loading when streaming with no plan data", () => {
    render(
      <TrainingPlanCalendar
        plan={null}
        isStreaming={true}
        error={null}
        onBack={vi.fn()}
        onExport={vi.fn()}
      />
    );
    expect(screen.getByText(/Generating your training plan/)).toBeInTheDocument();
  });

  it("shows error with try again button", () => {
    const onBack = vi.fn();
    render(
      <TrainingPlanCalendar
        plan={null}
        isStreaming={false}
        error="Something went wrong"
        onBack={onBack}
        onExport={vi.fn()}
      />
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it("renders nothing when no plan and not streaming", () => {
    const { container } = render(
      <TrainingPlanCalendar
        plan={null}
        isStreaming={false}
        error={null}
        onBack={vi.fn()}
        onExport={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows total weeks and event info", () => {
    render(<TrainingPlanCalendar {...defaultProps} />);
    expect(screen.getByText(/16 weeks/)).toBeInTheDocument();
    expect(screen.getByText(/16 weeks.*marathon/)).toBeInTheDocument();
  });

  describe("streaming with partial data", () => {
    it("does not crash with incomplete session data", () => {
      const partialPlan: Partial<TrainingPlanOutputType> = {
        plan_name: "Test Plan",
        overview: "Overview",
        weeks: [
          {
            week_number: 1,
            phase: "Base",
            focus: "Easy",
            sessions: [
              // Session missing title and type (partially streamed)
              { date: "2026-07-06", day_of_week: "Monday", title: "", type: "", duration_minutes: 0, description: "", intensity: "easy", details: [] },
            ],
          },
        ],
      };
      // Should not throw
      const { container } = render(
        <TrainingPlanCalendar
          plan={partialPlan}
          isStreaming={true}
          error={null}
          onBack={vi.fn()}
          onExport={vi.fn()}
        />
      );
      expect(container).toBeTruthy();
    });

    it("does not crash with invalid date strings", () => {
      const partialPlan: Partial<TrainingPlanOutputType> = {
        plan_name: "Test Plan",
        overview: "Overview",
        weeks: [
          {
            week_number: 1,
            phase: "Base",
            focus: "Easy",
            sessions: [
              // Partial date from streaming (not yet complete)
              { date: "2026-07" as string, day_of_week: "Monday", title: "Run", type: "run", duration_minutes: 30, description: "Test", intensity: "easy", details: [] },
            ],
          },
        ],
      };
      const { container } = render(
        <TrainingPlanCalendar
          plan={partialPlan}
          isStreaming={true}
          error={null}
          onBack={vi.fn()}
          onExport={vi.fn()}
        />
      );
      expect(container).toBeTruthy();
    });

    it("does not crash when sessions array is undefined on a week", () => {
      const partialPlan: Partial<TrainingPlanOutputType> = {
        plan_name: "Test Plan",
        overview: "Overview",
        weeks: [
          {
            week_number: 1,
            phase: "Base",
            focus: "Easy",
            sessions: [],
          },
          // Simulate a partially-parsed week with no sessions yet
          { week_number: 2, phase: "Build", focus: "More" } as TrainingPlanOutputType["weeks"][number],
        ],
      };
      const { container } = render(
        <TrainingPlanCalendar
          plan={partialPlan}
          isStreaming={true}
          error={null}
          onBack={vi.fn()}
          onExport={vi.fn()}
        />
      );
      expect(container).toBeTruthy();
    });

    it("shows error banner alongside partial results", () => {
      render(
        <TrainingPlanCalendar
          plan={mockPlan}
          isStreaming={false}
          error="Plan generation was interrupted. Showing partial results."
          onBack={vi.fn()}
          onExport={vi.fn()}
        />
      );
      expect(screen.getByText(/interrupted/)).toBeInTheDocument();
      // Calendar should still render
      expect(screen.getByText("Marathon Training Plan")).toBeInTheDocument();
    });
  });
});
