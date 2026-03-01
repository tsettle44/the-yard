import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/config", () => ({
  config: {
    get isHosted() { return false; },
    get isSelfHosted() { return true; },
  },
}));

// Mock migration
vi.mock("@/lib/migrations/gym-v2", () => ({
  needsMigration: vi.fn().mockReturnValue(false),
  migrateGyms: vi.fn((gyms: unknown[]) => gyms),
  markMigrated: vi.fn(),
}));

import { useGym } from "@/hooks/use-gym";

describe("useGym — Self-hosted", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("starts with empty gyms", () => {
    const { result } = renderHook(() => useGym());
    expect(result.current.gyms).toEqual([]);
  });

  it("creates a gym", () => {
    const { result } = renderHook(() => useGym());
    act(() => {
      result.current.createGym("My Gym");
    });
    expect(result.current.gyms).toHaveLength(1);
    expect(result.current.gyms[0].name).toBe("My Gym");
  });

  it("sets active gym after creation", () => {
    const { result } = renderHook(() => useGym());
    act(() => {
      result.current.createGym("Active Gym");
    });
    expect(result.current.activeGym?.name).toBe("Active Gym");
  });

  it("updates gym name", () => {
    const { result } = renderHook(() => useGym());
    let gymId: string;
    act(() => {
      const g = result.current.createGym("Original");
      gymId = g.id;
    });
    act(() => {
      result.current.updateGymName(gymId!, "Updated");
    });
    expect(result.current.gyms[0].name).toBe("Updated");
  });

  it("deletes a gym", () => {
    const { result } = renderHook(() => useGym());
    let gymId: string;
    act(() => {
      const g = result.current.createGym("Delete Me");
      gymId = g.id;
    });
    act(() => {
      result.current.deleteGym(gymId!);
    });
    expect(result.current.gyms).toHaveLength(0);
  });

  it("adds equipment", () => {
    const { result } = renderHook(() => useGym());
    let gymId: string;
    act(() => {
      const g = result.current.createGym("Gym");
      gymId = g.id;
    });
    act(() => {
      result.current.addEquipment(gymId!, {
        slug: "barbell",
        name: "Barbell",
        category: "strength",
        attributes: {},
      });
    });
    expect(result.current.gyms[0].equipment).toHaveLength(1);
    expect(result.current.gyms[0].equipment![0].quantity).toBe(1);
  });

  it("removes equipment", () => {
    const { result } = renderHook(() => useGym());
    let gymId: string;
    let eqId: string;
    act(() => {
      const g = result.current.createGym("Gym");
      gymId = g.id;
    });
    act(() => {
      const eq = result.current.addEquipment(gymId!, {
        slug: "barbell",
        name: "Barbell",
        category: "strength",
        attributes: {},
      });
      eqId = eq.id;
    });
    act(() => {
      result.current.removeEquipment(gymId!, eqId!);
    });
    expect(result.current.gyms[0].equipment).toHaveLength(0);
  });

  it("cascades equipment removal to shared resources", () => {
    const { result } = renderHook(() => useGym());
    let gymId: string;
    let eq1Id: string;
    let eq2Id: string;
    let eq3Id: string;
    act(() => {
      const g = result.current.createGym("Gym");
      gymId = g.id;
    });
    act(() => {
      const e1 = result.current.addEquipment(gymId!, { slug: "barbell", name: "Barbell", category: "strength", attributes: {} });
      eq1Id = e1.id;
      const e2 = result.current.addEquipment(gymId!, { slug: "squat-rack", name: "Squat Rack", category: "strength", attributes: {} });
      eq2Id = e2.id;
      const e3 = result.current.addEquipment(gymId!, { slug: "bench-press", name: "Bench", category: "strength", attributes: {} });
      eq3Id = e3.id;
    });
    act(() => {
      result.current.addSharedResource(gymId!, {
        resource_name: "Station",
        equipment_ids: [eq1Id!, eq2Id!, eq3Id!],
        constraint: "no_superset",
      });
    });
    // Remove eq1 — shared resource should drop from 3 to 2 (still valid)
    act(() => {
      result.current.removeEquipment(gymId!, eq1Id!);
    });
    expect(result.current.gyms[0].shared_resources).toHaveLength(1);
    expect(result.current.gyms[0].shared_resources![0].equipment_ids).toHaveLength(2);

    // Remove another — shared resource should be removed (< 2 items)
    act(() => {
      result.current.removeEquipment(gymId!, eq2Id!);
    });
    expect(result.current.gyms[0].shared_resources).toHaveLength(0);
  });

  it("updates equipment quantity", () => {
    const { result } = renderHook(() => useGym());
    let gymId: string;
    let eqId: string;
    act(() => {
      const g = result.current.createGym("Gym");
      gymId = g.id;
    });
    act(() => {
      const eq = result.current.addEquipment(gymId!, { slug: "barbell", name: "Barbell", category: "strength", attributes: {} });
      eqId = eq.id;
    });
    act(() => {
      result.current.updateEquipmentQuantity(gymId!, eqId!, 3);
    });
    expect(result.current.gyms[0].equipment![0].quantity).toBe(3);
  });

  it("enforces minimum quantity of 1", () => {
    const { result } = renderHook(() => useGym());
    let gymId: string;
    let eqId: string;
    act(() => {
      const g = result.current.createGym("Gym");
      gymId = g.id;
    });
    act(() => {
      const eq = result.current.addEquipment(gymId!, { slug: "barbell", name: "Barbell", category: "strength", attributes: {} });
      eqId = eq.id;
    });
    act(() => {
      result.current.updateEquipmentQuantity(gymId!, eqId!, 0);
    });
    expect(result.current.gyms[0].equipment![0].quantity).toBe(1);
  });

  it("adds shared resource", () => {
    const { result } = renderHook(() => useGym());
    let gymId: string;
    act(() => {
      const g = result.current.createGym("Gym");
      gymId = g.id;
    });
    act(() => {
      result.current.addSharedResource(gymId!, {
        resource_name: "Station",
        equipment_ids: ["eq1", "eq2"],
        constraint: "no_superset",
      });
    });
    expect(result.current.gyms[0].shared_resources).toHaveLength(1);
  });

  it("removes shared resource", () => {
    const { result } = renderHook(() => useGym());
    let gymId: string;
    let srId: string;
    act(() => {
      const g = result.current.createGym("Gym");
      gymId = g.id;
    });
    act(() => {
      const sr = result.current.addSharedResource(gymId!, {
        resource_name: "Station",
        equipment_ids: ["eq1", "eq2"],
        constraint: "no_superset",
      });
      srId = sr.id;
    });
    act(() => {
      result.current.removeSharedResource(gymId!, srId!);
    });
    expect(result.current.gyms[0].shared_resources).toHaveLength(0);
  });

  it("updates layout notes", () => {
    const { result } = renderHook(() => useGym());
    let gymId: string;
    act(() => {
      const g = result.current.createGym("Gym");
      gymId = g.id;
    });
    act(() => {
      result.current.updateLayoutNotes(gymId!, "10x10 garage");
    });
    expect(result.current.gyms[0].layout_notes).toBe("10x10 garage");
  });

  it("resolves activeGym to first gym when no activeGymId", () => {
    const { result } = renderHook(() => useGym());
    act(() => {
      result.current.createGym("First");
    });
    expect(result.current.activeGym?.name).toBe("First");
  });

  it("returns null activeGym when no gyms", () => {
    const { result } = renderHook(() => useGym());
    expect(result.current.activeGym).toBeNull();
  });

  it("clears activeGymId when deleting active gym", () => {
    const { result } = renderHook(() => useGym());
    let gymId: string;
    act(() => {
      const g = result.current.createGym("Gym");
      gymId = g.id;
    });
    act(() => {
      result.current.deleteGym(gymId!);
    });
    expect(result.current.activeGymId).toBeNull();
  });

  it("is not loading in self-hosted mode", () => {
    const { result } = renderHook(() => useGym());
    expect(result.current.loading).toBe(false);
  });
});
