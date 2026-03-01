import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileCard } from "@/components/profiles/profile-card";
import { makeProfile } from "../fixtures";

describe("ProfileCard", () => {
  const defaultProps = {
    profile: makeProfile({
      name: "Test Athlete",
      fitness_level: "intermediate",
      preferred_styles: ["strength", "hiit"],
      goals: "Build muscle",
    }),
    isActive: false,
    onSelect: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  it("renders profile name", () => {
    render(<ProfileCard {...defaultProps} />);
    expect(screen.getByText("Test Athlete")).toBeInTheDocument();
  });

  it("renders fitness level", () => {
    render(<ProfileCard {...defaultProps} />);
    expect(screen.getByText("intermediate")).toBeInTheDocument();
  });

  it("renders preferred styles", () => {
    render(<ProfileCard {...defaultProps} />);
    expect(screen.getByText("strength")).toBeInTheDocument();
    expect(screen.getByText("hiit")).toBeInTheDocument();
  });

  it("renders goals", () => {
    render(<ProfileCard {...defaultProps} />);
    expect(screen.getByText("Build muscle")).toBeInTheDocument();
  });

  it("shows check icon when active", () => {
    render(<ProfileCard {...defaultProps} isActive={true} />);
    // Check icon rendered by lucide-react
    const card = screen.getByText("Test Athlete").closest("[class*='cursor-pointer']");
    expect(card).toHaveClass("border-foreground");
  });

  it("calls onSelect when card clicked", () => {
    const onSelect = vi.fn();
    render(<ProfileCard {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Test Athlete"));
    expect(onSelect).toHaveBeenCalled();
  });

  it("calls onEdit when edit button clicked", () => {
    const onEdit = vi.fn();
    render(<ProfileCard {...defaultProps} onEdit={onEdit} />);
    // Find the pencil button (first icon button)
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // Edit button
    expect(onEdit).toHaveBeenCalled();
  });

  it("calls onDelete when delete button clicked", () => {
    const onDelete = vi.fn();
    render(<ProfileCard {...defaultProps} onDelete={onDelete} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // Delete button
    expect(onDelete).toHaveBeenCalled();
  });

  it("stopPropagation on edit/delete clicks", () => {
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    render(<ProfileCard {...defaultProps} onSelect={onSelect} onEdit={onEdit} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // Edit
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does not render goals when empty", () => {
    const profile = makeProfile({ goals: "" });
    render(<ProfileCard {...defaultProps} profile={profile} />);
    expect(screen.queryByText("Build muscle")).not.toBeInTheDocument();
  });

  it("handles empty preferred_styles", () => {
    const profile = makeProfile({ preferred_styles: [] });
    render(<ProfileCard {...defaultProps} profile={profile} />);
    expect(screen.getByText("Test Athlete")).toBeInTheDocument();
  });
});
