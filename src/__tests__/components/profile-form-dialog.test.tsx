import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileFormDialog } from "@/components/profiles/profile-form-dialog";
import { makeProfile } from "../fixtures";

describe("ProfileFormDialog", () => {
  it("renders when open", () => {
    render(
      <ProfileFormDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    // "New Profile" appears in both the sr-only DialogTitle and ProfileForm's CardTitle
    expect(screen.getAllByText("New Profile").length).toBeGreaterThanOrEqual(1);
  });

  it("does not render when closed", () => {
    render(
      <ProfileFormDialog
        open={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.queryByText("New Profile")).not.toBeInTheDocument();
  });

  it("shows create mode when no profile", () => {
    render(
      <ProfileFormDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText("Create Profile")).toBeInTheDocument();
  });

  it("shows edit mode when profile provided", () => {
    const profile = makeProfile({ name: "Edit Me" });
    render(
      <ProfileFormDialog
        open={true}
        onOpenChange={vi.fn()}
        profile={profile}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText("Update Profile")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Edit Me")).toBeInTheDocument();
  });

  it("populates form with profile data", () => {
    const profile = makeProfile({
      name: "Athlete",
      fitness_level: "advanced",
      goals: "Compete",
    });
    render(
      <ProfileFormDialog
        open={true}
        onOpenChange={vi.fn()}
        profile={profile}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue("Athlete")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Compete")).toBeInTheDocument();
  });
});
