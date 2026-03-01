import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkoutStream } from "@/components/workout/workout-stream";

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock react-markdown
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

describe("WorkoutStream", () => {
  it("renders nothing when no content and not streaming", () => {
    const { container } = render(
      <WorkoutStream content="" isStreaming={false} error={null} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders markdown content", () => {
    render(
      <WorkoutStream content="# Workout" isStreaming={false} error={null} />
    );
    expect(screen.getByText("# Workout")).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(
      <WorkoutStream content="" isStreaming={false} error="Failed to generate" />
    );
    expect(screen.getByText("Failed to generate")).toBeInTheDocument();
  });

  it("shows generating title while streaming", () => {
    render(
      <WorkoutStream content="partial content" isStreaming={true} error={null} />
    );
    expect(screen.getByText("Generating...")).toBeInTheDocument();
  });

  it("shows 'Workout' title when complete", () => {
    render(
      <WorkoutStream content="## Warm-Up\nContent" isStreaming={false} error={null} />
    );
    expect(screen.getByText("Workout")).toBeInTheDocument();
  });

  it("parses sections from markdown headings", () => {
    const content = "## Warm-Up\nJog for 5 min\n## Main Workout\nBench Press 3x10\n## Cool-Down\nStretch";
    render(
      <WorkoutStream content={content} isStreaming={false} error={null} />
    );
    expect(screen.getByText("Warm-Up")).toBeInTheDocument();
    expect(screen.getByText("Main Workout")).toBeInTheDocument();
    expect(screen.getByText("Cool-Down")).toBeInTheDocument();
  });

  it("classifies warm-up sections", () => {
    const content = "## Warm-Up Routine\nExercises here";
    render(
      <WorkoutStream content={content} isStreaming={false} error={null} />
    );
    expect(screen.getByText("Warm-Up Routine")).toBeInTheDocument();
  });

  it("shows raw markdown while streaming (before sections)", () => {
    render(
      <WorkoutStream content="## Warm-Up\nJog" isStreaming={true} error={null} />
    );
    // During streaming, should show raw markdown rendering
    expect(screen.getByText("Generating...")).toBeInTheDocument();
  });

  it("shows copy button when complete", () => {
    render(
      <WorkoutStream content="workout content" isStreaming={false} error={null} />
    );
    expect(screen.getByTitle("Copy")).toBeInTheDocument();
  });

  it("hides copy button while streaming", () => {
    render(
      <WorkoutStream content="workout content" isStreaming={true} error={null} />
    );
    expect(screen.queryByTitle("Copy")).not.toBeInTheDocument();
  });

  it("shows save button when onSave provided", () => {
    render(
      <WorkoutStream content="content" isStreaming={false} error={null} onSave={vi.fn()} />
    );
    expect(screen.getByTitle("Save")).toBeInTheDocument();
  });

  it("calls onSave when save clicked", () => {
    const onSave = vi.fn();
    render(
      <WorkoutStream content="content" isStreaming={false} error={null} onSave={onSave} />
    );
    fireEvent.click(screen.getByTitle("Save"));
    expect(onSave).toHaveBeenCalled();
  });

  it("copies content to clipboard", () => {
    render(
      <WorkoutStream content="workout content" isStreaming={false} error={null} />
    );
    fireEvent.click(screen.getByTitle("Copy"));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("workout content");
  });

  it("handles content without sections", () => {
    render(
      <WorkoutStream content="Just some text without sections" isStreaming={false} error={null} />
    );
    expect(screen.getByText("Just some text without sections")).toBeInTheDocument();
  });
});
