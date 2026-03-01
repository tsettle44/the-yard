import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EquipmentPicker } from "@/components/gym/equipment-picker";
import { makeEquipment } from "../fixtures";

describe("EquipmentPicker", () => {
  const defaultProps = {
    gymId: "gym-1",
    currentEquipment: [] as ReturnType<typeof makeEquipment>[],
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onUpdateQuantity: vi.fn(),
  };

  it("renders category headers", () => {
    render(<EquipmentPicker {...defaultProps} />);
    expect(screen.getByText("Strength")).toBeInTheDocument();
    expect(screen.getByText("Cardio")).toBeInTheDocument();
    expect(screen.getByText("Bodyweight")).toBeInTheDocument();
    expect(screen.getByText("Accessories")).toBeInTheDocument();
  });

  it("renders equipment items", () => {
    render(<EquipmentPicker {...defaultProps} />);
    expect(screen.getByText("Barbell")).toBeInTheDocument();
    expect(screen.getByText("Dumbbells")).toBeInTheDocument();
    expect(screen.getByText("Treadmill")).toBeInTheDocument();
  });

  it("shows checkbox checked for current equipment", () => {
    const eq = makeEquipment({ slug: "barbell", name: "Barbell" });
    render(<EquipmentPicker {...defaultProps} currentEquipment={[eq]} />);
    // The barbell item should be checked
    const checkbox = screen.getByText("Barbell").closest("label")?.querySelector('[role="checkbox"]');
    expect(checkbox).toHaveAttribute("data-state", "checked");
  });

  it("calls onAdd when checking equipment", () => {
    const onAdd = vi.fn();
    render(<EquipmentPicker {...defaultProps} onAdd={onAdd} />);
    const barbellLabel = screen.getByText("Barbell").closest("label");
    const checkbox = barbellLabel?.querySelector('[role="checkbox"]');
    if (checkbox) fireEvent.click(checkbox);
    expect(onAdd).toHaveBeenCalledWith("barbell", "Barbell", "strength");
  });

  it("calls onRemove when unchecking equipment", () => {
    const onRemove = vi.fn();
    const eq = makeEquipment({ id: "eq-1", slug: "barbell", name: "Barbell" });
    render(<EquipmentPicker {...defaultProps} currentEquipment={[eq]} onRemove={onRemove} />);
    const barbellLabel = screen.getByText("Barbell").closest("label");
    const checkbox = barbellLabel?.querySelector('[role="checkbox"]');
    if (checkbox) fireEvent.click(checkbox);
    expect(onRemove).toHaveBeenCalledWith("eq-1");
  });

  it("shows quantity controls for selected equipment", () => {
    const eq = makeEquipment({ slug: "barbell", name: "Barbell", quantity: 2 });
    render(<EquipmentPicker {...defaultProps} currentEquipment={[eq]} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("calls onUpdateQuantity when plus clicked", () => {
    const onUpdateQuantity = vi.fn();
    const eq = makeEquipment({ id: "eq-1", slug: "barbell", name: "Barbell", quantity: 1 });
    render(<EquipmentPicker {...defaultProps} currentEquipment={[eq]} onUpdateQuantity={onUpdateQuantity} />);
    // Find the plus button (second icon button near the equipment)
    const buttons = screen.getAllByRole("button");
    // Plus button should increment
    const plusButton = buttons.find(b => !b.hasAttribute("disabled") && b.querySelector('[class*="h-3"]'));
    if (plusButton) fireEvent.click(plusButton);
    expect(onUpdateQuantity).toHaveBeenCalled();
  });

  it("disables minus button at quantity 1", () => {
    const eq = makeEquipment({ id: "eq-1", slug: "barbell", name: "Barbell", quantity: 1 });
    render(<EquipmentPicker {...defaultProps} currentEquipment={[eq]} />);
    const disabledButtons = screen.getAllByRole("button").filter(b => b.hasAttribute("disabled"));
    expect(disabledButtons.length).toBeGreaterThan(0);
  });
});
