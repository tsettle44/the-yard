import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SharedResourceEditor } from "@/components/gym/shared-resource-editor";
import { makeEquipment, makeSharedResource } from "../fixtures";

describe("SharedResourceEditor", () => {
  const eq1 = makeEquipment({ id: "eq-1", slug: "barbell", name: "Barbell" });
  const eq2 = makeEquipment({ id: "eq-2", slug: "squat-rack", name: "Squat Rack" });
  const eq3 = makeEquipment({ id: "eq-3", slug: "bench-press", name: "Bench Press" });

  const defaultProps = {
    gymId: "gym-1",
    equipment: [eq1, eq2, eq3],
    sharedResources: [],
    suggestions: [],
    onAdd: vi.fn(),
    onRemove: vi.fn(),
  };

  it("shows minimum equipment message when < 2 equipment", () => {
    render(<SharedResourceEditor {...defaultProps} equipment={[eq1]} />);
    expect(screen.getByText(/at least 2 pieces/)).toBeInTheDocument();
  });

  it("renders existing shared resources", () => {
    const sr = makeSharedResource({
      resource_name: "Barbell Station",
      equipment_ids: ["eq-1", "eq-2"],
      constraint: "no_superset",
    });
    render(<SharedResourceEditor {...defaultProps} sharedResources={[sr]} />);
    // "Barbell Station" may appear in suggestions as well
    expect(screen.getAllByText("Barbell Station").length).toBeGreaterThanOrEqual(1);
    // "No Superset" appears in both the resource display and the constraint dropdown
    expect(screen.getAllByText("No Superset").length).toBeGreaterThanOrEqual(1);
  });

  it("renders equipment names in shared resources", () => {
    const sr = makeSharedResource({
      resource_name: "Station",
      equipment_ids: ["eq-1", "eq-2"],
      constraint: "no_superset",
    });
    render(<SharedResourceEditor {...defaultProps} sharedResources={[sr]} />);
    // Equipment names may appear in both the shared resource badges and the add form checkboxes
    expect(screen.getAllByText("Barbell").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Squat Rack").length).toBeGreaterThanOrEqual(1);
  });

  it("renders notes in shared resources", () => {
    const sr = makeSharedResource({
      resource_name: "Station",
      equipment_ids: ["eq-1", "eq-2"],
      constraint: "no_superset",
      notes: "Only one barbell",
    });
    render(<SharedResourceEditor {...defaultProps} sharedResources={[sr]} />);
    expect(screen.getByText("Only one barbell")).toBeInTheDocument();
  });

  it("calls onRemove when remove button clicked", () => {
    const onRemove = vi.fn();
    const sr = makeSharedResource({ id: "sr-1", resource_name: "Station", equipment_ids: ["eq-1", "eq-2"] });
    render(<SharedResourceEditor {...defaultProps} sharedResources={[sr]} onRemove={onRemove} />);
    const removeButtons = screen.getAllByRole("button");
    // The X button for removing the resource
    const xButton = removeButtons.find(b => b.closest('[class*="shrink-0"]'));
    if (xButton) fireEvent.click(xButton);
    expect(onRemove).toHaveBeenCalledWith("sr-1");
  });

  it("disables add button without name", () => {
    render(<SharedResourceEditor {...defaultProps} />);
    const addButton = screen.getByText("Add Shared Resource").closest("button");
    expect(addButton).toBeDisabled();
  });

  it("disables add button with less than 2 selected equipment", async () => {
    render(<SharedResourceEditor {...defaultProps} />);
    const user = userEvent.setup();
    const nameInput = screen.getByPlaceholderText("e.g. Barbell Station");
    await user.type(nameInput, "Test Resource");
    const addButton = screen.getByText("Add Shared Resource").closest("button");
    expect(addButton).toBeDisabled();
  });

  it("renders constraint types in add form", () => {
    render(<SharedResourceEditor {...defaultProps} />);
    expect(screen.getByText("Constraint")).toBeInTheDocument();
  });

  it("renders suggestions when available", () => {
    const suggestions = [
      {
        resource_name: "Barbell Station",
        equipment_slugs: ["barbell", "squat-rack", "bench-press"],
        constraint: "group_together" as const,
        reason: "Same barbell",
      },
    ];
    render(<SharedResourceEditor {...defaultProps} suggestions={suggestions} />);
    expect(screen.getByText("Suggested Groups")).toBeInTheDocument();
    expect(screen.getByText("Barbell Station")).toBeInTheDocument();
    expect(screen.getByText("Same barbell")).toBeInTheDocument();
  });

  it("applies suggestion on click", () => {
    const onAdd = vi.fn();
    const suggestions = [
      {
        resource_name: "Barbell Station",
        equipment_slugs: ["barbell", "squat-rack"],
        constraint: "group_together" as const,
        reason: "Same barbell",
      },
    ];
    render(<SharedResourceEditor {...defaultProps} suggestions={suggestions} onAdd={onAdd} />);
    fireEvent.click(screen.getByText("Add"));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_name: "Barbell Station",
        constraint: "group_together",
      })
    );
  });

  it("dismisses suggestion", () => {
    const suggestions = [
      {
        resource_name: "Barbell Station",
        equipment_slugs: ["barbell", "squat-rack"],
        constraint: "group_together" as const,
        reason: "Same barbell",
      },
    ];
    render(<SharedResourceEditor {...defaultProps} suggestions={suggestions} />);
    // Find the X dismiss button (small one next to Add)
    const buttons = screen.getAllByRole("button");
    const dismissButton = buttons.find(b => b.querySelector('[class*="h-3 w-3"]'));
    if (dismissButton) fireEvent.click(dismissButton);
    expect(screen.queryByText("Same barbell")).not.toBeInTheDocument();
  });

  it("resolves equipment names by id", () => {
    const sr = makeSharedResource({
      equipment_ids: ["eq-1", "unknown-id"],
      resource_name: "Test",
    });
    render(<SharedResourceEditor {...defaultProps} sharedResources={[sr]} />);
    // "Barbell" may appear in both the shared resource badges and the equipment list
    expect(screen.getAllByText("Barbell").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("unknown-id")).toBeInTheDocument(); // falls back to id
  });
});
