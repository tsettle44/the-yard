import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GroupSizeFields } from "@/components/workout/group-size-fields";
import { WorkoutForm } from "@/components/workout/workout-form";

describe("GroupSizeFields", () => {
  it("offers 2 through 6 people", () => {
    render(<GroupSizeFields groupSize={2} onGroupSizeChange={vi.fn()} names={[]} onNamesChange={vi.fn()} />);
    for (const n of [2, 3, 4, 5, 6]) {
      expect(screen.getByRole("button", { name: String(n) })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "7" })).not.toBeInTheDocument();
  });

  it("reports size changes", () => {
    const onChange = vi.fn();
    render(<GroupSizeFields groupSize={2} onGroupSizeChange={onChange} names={[]} onNamesChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("renders one name input per person", () => {
    render(<GroupSizeFields groupSize={4} onGroupSizeChange={vi.fn()} names={[]} onNamesChange={vi.fn()} />);
    expect(screen.getAllByLabelText(/Name for person/)).toHaveLength(4);
  });

  it("reports name changes", () => {
    const onNames = vi.fn();
    render(<GroupSizeFields groupSize={3} onGroupSizeChange={vi.fn()} names={["A"]} onNamesChange={onNames} />);
    fireEvent.change(screen.getByLabelText("Name for person 3"), { target: { value: "Cy" } });
    expect(onNames).toHaveBeenCalledWith(["A", "", "Cy"]);
  });
});

describe("WorkoutForm extension props", () => {
  const props = { profileId: "p1", gymId: "g1", onGenerate: vi.fn(), isStreaming: false };

  it("renders custom title, submit label and children", () => {
    render(
      <WorkoutForm {...props} title="Group Workout" submitLabel="Generate Group Workout">
        <div>extra-field</div>
      </WorkoutForm>
    );
    expect(screen.getByText("Group Workout")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Group Workout" })).toBeInTheDocument();
    expect(screen.getByText("extra-field")).toBeInTheDocument();
  });

  it("keeps default labels", () => {
    render(<WorkoutForm {...props} />);
    expect(screen.getByRole("button", { name: "Generate Workout" })).toBeInTheDocument();
  });
});
