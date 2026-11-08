import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { makeProfile, makeGym, makeEquipment } from "../fixtures";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const profile = makeProfile({ id: "p1" });
const gym = makeGym({
  id: "g1",
  equipment: [makeEquipment({ id: "eq-bb", name: "Barbell", quantity: 1 })],
  shared_resources: [],
});

vi.mock("@/hooks/use-profile", () => ({
  useProfiles: () => ({ activeProfile: profile, guestMode: false, hydrated: true }),
}));
vi.mock("@/hooks/use-gym", () => ({
  useGym: () => ({ activeGym: gym, hydrated: true }),
}));
vi.mock("@/hooks/use-entitlement", () => ({
  useEntitlement: () => ({ plan: null, remaining: 0, canGenerate: true, loading: false, refresh: vi.fn() }),
}));

const mockAddWorkout = vi.fn();
vi.mock("@/hooks/use-workouts", () => ({
  useWorkouts: () => ({ addWorkout: mockAddWorkout }),
}));

const mockGenerate = vi.fn();
const groupState = {
  workout: null as unknown,
  isLoading: false,
  error: null as string | null,
  violations: [] as string[],
};
vi.mock("@/hooks/use-group-workout", () => ({
  useGroupWorkout: () => ({ ...groupState, generate: mockGenerate, reset: vi.fn() }),
}));

import GroupGeneratePage from "@/app/(app)/generate/group/page";

const plan = {
  warmup: [],
  blocks: [
    {
      name: "Block A",
      format: "straight",
      slots: [
        {
          assignments: [
            { person: 0, name: "Back Squat", sets: "3", reps: "8", rest: "90s", equipment_ids: ["eq-bb"] },
            { person: 1, name: "Push-up", sets: "3", reps: "12", rest: "60s", equipment_ids: [] },
            { person: 2, name: "Lunge", sets: "3", reps: "10", rest: "60s", equipment_ids: [] },
          ],
        },
      ],
    },
  ],
  cooldown: [],
  coaching: [],
};

function people(n: number) {
  return within(screen.getByRole("group", { name: "Number of people" })).getByRole("button", { name: String(n) });
}

describe("GroupGeneratePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    groupState.workout = null;
    groupState.isLoading = false;
    groupState.error = null;
    groupState.violations = [];
  });

  it("links back to the solo generator and shows the people selector", () => {
    render(<GroupGeneratePage />);
    expect(screen.getByRole("link", { name: /Solo workout/ })).toHaveAttribute("href", "/generate");
    expect(people(6)).toBeInTheDocument();
  });

  it("sends group_size and names with the request", () => {
    render(<GroupGeneratePage />);
    fireEvent.click(people(3));
    fireEvent.change(screen.getByLabelText("Name for person 1"), { target: { value: " Ann " } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Group Workout" }));

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    const arg = mockGenerate.mock.calls[0][0];
    expect(arg.request.group_size).toBe(3);
    expect(arg.request.person_names).toEqual(["Ann"]);
    expect(arg.equipmentData).toEqual(gym.equipment);
  });

  it("shows the loading state while generating", () => {
    render(<GroupGeneratePage />);
    groupState.isLoading = true;
    fireEvent.click(screen.getByRole("button", { name: "Generate Group Workout" }));
    expect(screen.getByText("Designing a conflict-free plan…")).toBeInTheDocument();
  });

  it("shows a 422 error with violations and Try Again", () => {
    render(<GroupGeneratePage />);
    groupState.error = "Couldn't build a conflict-free group workout";
    groupState.violations = ["Block 1: Barbell used by 2"];
    fireEvent.click(screen.getByRole("button", { name: "Generate Group Workout" }));
    expect(screen.getByText("Couldn't build a conflict-free group workout")).toBeInTheDocument();
    expect(screen.getByText("Block 1: Barbell used by 2")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Try Again"));
    expect(screen.getByRole("button", { name: "Generate Group Workout" })).toBeInTheDocument();
  });

  it("saves a group workout with group_size and display names", () => {
    groupState.workout = plan;
    render(<GroupGeneratePage />);
    fireEvent.click(people(3));
    fireEvent.click(screen.getByRole("button", { name: "Generate Group Workout" }));
    fireEvent.click(screen.getByText("Save"));

    expect(mockAddWorkout).toHaveBeenCalledTimes(1);
    const saved = mockAddWorkout.mock.calls[0][0];
    expect(saved.parameters.group_size).toBe(3);
    expect(saved.profile_id).toBe("p1");
    expect(saved.gym_id).toBe("g1");
    expect(saved.structured.blocks[0].slots).toHaveLength(1);
    expect(saved.structured.equipment_names).toEqual({ "eq-bb": "Barbell" });
    expect(JSON.parse(saved.content).blocks).toHaveLength(1);
  });
});
