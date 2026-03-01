import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Default to self-hosted
vi.mock("@/lib/config", () => ({
  config: {
    get isHosted() { return false; },
    get isSelfHosted() { return true; },
  },
}));

import { useProfiles } from "@/hooks/use-profile";

describe("useProfiles — Self-hosted", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("starts with empty profiles", () => {
    const { result } = renderHook(() => useProfiles());
    expect(result.current.profiles).toEqual([]);
  });

  it("adds a profile", () => {
    const { result } = renderHook(() => useProfiles());
    act(() => {
      result.current.addProfile({
        name: "Test",
        fitness_level: "beginner",
        preferred_styles: [],
        goals: "",
        preferences: {},
        is_default: false,
      });
    });
    expect(result.current.profiles).toHaveLength(1);
    expect(result.current.profiles[0].name).toBe("Test");
  });

  it("updates a profile", () => {
    const { result } = renderHook(() => useProfiles());
    let profileId: string;
    act(() => {
      const p = result.current.addProfile({
        name: "Original",
        fitness_level: "beginner",
        preferred_styles: [],
        goals: "",
        preferences: {},
        is_default: false,
      });
      profileId = p.id;
    });
    act(() => {
      result.current.updateProfile(profileId!, { name: "Updated" });
    });
    expect(result.current.profiles[0].name).toBe("Updated");
  });

  it("deletes a profile", () => {
    const { result } = renderHook(() => useProfiles());
    let profileId: string;
    act(() => {
      const p = result.current.addProfile({
        name: "Delete Me",
        fitness_level: "beginner",
        preferred_styles: [],
        goals: "",
        preferences: {},
        is_default: false,
      });
      profileId = p.id;
    });
    act(() => {
      result.current.deleteProfile(profileId!);
    });
    expect(result.current.profiles).toHaveLength(0);
  });

  it("resolves activeProfile by activeProfileId", () => {
    const { result } = renderHook(() => useProfiles());
    let profileId: string;
    act(() => {
      const p = result.current.addProfile({
        name: "Active",
        fitness_level: "intermediate",
        preferred_styles: [],
        goals: "",
        preferences: {},
        is_default: false,
      });
      profileId = p.id;
    });
    act(() => {
      result.current.setActiveProfileId(profileId!);
    });
    expect(result.current.activeProfile?.name).toBe("Active");
  });

  it("falls back to default profile", () => {
    const { result } = renderHook(() => useProfiles());
    act(() => {
      result.current.addProfile({
        name: "Default",
        fitness_level: "beginner",
        preferred_styles: [],
        goals: "",
        preferences: {},
        is_default: true,
      });
    });
    expect(result.current.activeProfile?.name).toBe("Default");
  });

  it("falls back to first profile", () => {
    const { result } = renderHook(() => useProfiles());
    act(() => {
      result.current.addProfile({
        name: "First",
        fitness_level: "beginner",
        preferred_styles: [],
        goals: "",
        preferences: {},
        is_default: false,
      });
    });
    expect(result.current.activeProfile?.name).toBe("First");
  });

  it("returns null when no profiles", () => {
    const { result } = renderHook(() => useProfiles());
    expect(result.current.activeProfile).toBeNull();
  });

  it("guest mode returns null activeProfile", () => {
    const { result } = renderHook(() => useProfiles());
    act(() => {
      result.current.addProfile({
        name: "Test",
        fitness_level: "beginner",
        preferred_styles: [],
        goals: "",
        preferences: {},
        is_default: true,
      });
    });
    act(() => {
      result.current.setGuestMode(true);
    });
    expect(result.current.activeProfile).toBeNull();
    expect(result.current.guestMode).toBe(true);
  });

  it("unsets other defaults when adding default profile", () => {
    const { result } = renderHook(() => useProfiles());
    act(() => {
      result.current.addProfile({
        name: "First Default",
        fitness_level: "beginner",
        preferred_styles: [],
        goals: "",
        preferences: {},
        is_default: true,
      });
    });
    act(() => {
      result.current.addProfile({
        name: "Second Default",
        fitness_level: "beginner",
        preferred_styles: [],
        goals: "",
        preferences: {},
        is_default: true,
      });
    });
    const defaults = result.current.profiles.filter((p) => p.is_default);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].name).toBe("Second Default");
  });

  it("clears activeProfileId when deleting active profile", () => {
    const { result } = renderHook(() => useProfiles());
    let profileId: string;
    act(() => {
      const p = result.current.addProfile({
        name: "Active",
        fitness_level: "beginner",
        preferred_styles: [],
        goals: "",
        preferences: {},
        is_default: false,
      });
      profileId = p.id;
    });
    act(() => {
      result.current.setActiveProfileId(profileId!);
    });
    act(() => {
      result.current.deleteProfile(profileId!);
    });
    expect(result.current.activeProfileId).toBeNull();
  });

  it("is not loading in self-hosted mode", () => {
    const { result } = renderHook(() => useProfiles());
    expect(result.current.loading).toBe(false);
  });
});
