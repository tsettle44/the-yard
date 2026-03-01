import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileForm } from "@/components/profiles/profile-form";

describe("ProfileForm", () => {
  const onSubmit = vi.fn();

  it("renders name field", () => {
    render(<ProfileForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("renders fitness level selector", () => {
    render(<ProfileForm onSubmit={onSubmit} />);
    expect(screen.getByText("Fitness Level")).toBeInTheDocument();
  });

  it("renders preferred styles buttons", () => {
    render(<ProfileForm onSubmit={onSubmit} />);
    expect(screen.getByText("Strength")).toBeInTheDocument();
    expect(screen.getByText("HIIT")).toBeInTheDocument();
  });

  it("renders goals textarea", () => {
    render(<ProfileForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText("Goals")).toBeInTheDocument();
  });

  it("renders injuries field", () => {
    render(<ProfileForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText("Injuries / Limitations")).toBeInTheDocument();
  });

  it("renders avoided exercises field", () => {
    render(<ProfileForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText("Exercises to Avoid")).toBeInTheDocument();
  });

  it("renders notes field", () => {
    render(<ProfileForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("renders default checkbox", () => {
    render(<ProfileForm onSubmit={onSubmit} />);
    expect(screen.getByText("Set as default profile")).toBeInTheDocument();
  });

  it("shows 'New Profile' title when no initial values", () => {
    render(<ProfileForm onSubmit={onSubmit} />);
    expect(screen.getByText("New Profile")).toBeInTheDocument();
  });

  it("shows 'Edit Profile' title with initial values", () => {
    render(
      <ProfileForm
        onSubmit={onSubmit}
        initialValues={{
          name: "Test",
          fitness_level: "beginner",
          preferred_styles: [],
          goals: "",
          preferences: {},
          is_default: false,
        }}
      />
    );
    expect(screen.getByText("Edit Profile")).toBeInTheDocument();
  });

  it("populates initial values", () => {
    render(
      <ProfileForm
        onSubmit={onSubmit}
        initialValues={{
          name: "John",
          fitness_level: "advanced",
          preferred_styles: ["strength"],
          goals: "Get stronger",
          preferences: { injuries: ["bad knee"], avoidedExercises: ["deadlift"], notes: "Morning only" },
          is_default: true,
        }}
      />
    );
    expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Get stronger")).toBeInTheDocument();
    expect(screen.getByDisplayValue("bad knee")).toBeInTheDocument();
    expect(screen.getByDisplayValue("deadlift")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Morning only")).toBeInTheDocument();
  });

  it("submits with formatted data", async () => {
    const handleSubmit = vi.fn();
    render(<ProfileForm onSubmit={handleSubmit} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Name"), "Test Athlete");
    await user.type(screen.getByLabelText("Goals"), "Build strength");
    await user.type(screen.getByLabelText("Injuries / Limitations"), "bad knee, shoulder");

    fireEvent.submit(screen.getByText("Save Profile").closest("form")!);

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Athlete",
        goals: "Build strength",
        preferences: expect.objectContaining({
          injuries: ["bad knee", "shoulder"],
        }),
      })
    );
  });

  it("toggles style selection", async () => {
    render(<ProfileForm onSubmit={onSubmit} />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Strength"));
    await user.click(screen.getByText("HIIT"));

    fireEvent.submit(screen.getByText("Save Profile").closest("form")!);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        preferred_styles: ["strength", "hiit"],
      })
    );
  });

  it("splits comma-separated injuries", async () => {
    const handleSubmit = vi.fn();
    render(<ProfileForm onSubmit={handleSubmit} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Name"), "Test");
    await user.type(screen.getByLabelText("Injuries / Limitations"), "knee, shoulder, back");

    fireEvent.submit(screen.getByText("Save Profile").closest("form")!);

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        preferences: expect.objectContaining({
          injuries: ["knee", "shoulder", "back"],
        }),
      })
    );
  });

  it("renders cancel button when onCancel provided", () => {
    const onCancel = vi.fn();
    render(<ProfileForm onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onCancel when cancel clicked", async () => {
    const onCancel = vi.fn();
    render(<ProfileForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("uses custom submit label", () => {
    render(<ProfileForm onSubmit={onSubmit} submitLabel="Update Profile" />);
    expect(screen.getByText("Update Profile")).toBeInTheDocument();
  });
});
