import type { Profile } from "@/types/profile";
import type { Gym, Equipment, SharedResourceGroup, EquipmentConflict } from "@/types/gym";
import type { Workout } from "@/types/workout";
import type { Entitlement, Payment } from "@/types/config";

let idCounter = 0;
function nextId() {
  return `fixture-${++idCounter}`;
}

export function resetFixtureIds() {
  idCounter = 0;
}

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: nextId(),
    user_id: "user-123",
    name: "Test Athlete",
    fitness_level: "intermediate",
    preferred_styles: ["strength", "hiit"],
    goals: "Build muscle and endurance",
    preferences: {},
    is_default: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeEquipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: nextId(),
    gym_id: "gym-1",
    slug: "barbell",
    name: "Barbell",
    category: "strength",
    attributes: {},
    quantity: 1,
    ...overrides,
  };
}

export function makeGym(overrides: Partial<Gym> = {}): Gym {
  return {
    id: nextId(),
    user_id: "user-123",
    name: "Home Gym",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    equipment: [],
    conflicts: [],
    shared_resources: [],
    layout_notes: "",
    ...overrides,
  };
}

export function makeSharedResource(overrides: Partial<SharedResourceGroup> = {}): SharedResourceGroup {
  return {
    id: nextId(),
    gym_id: "gym-1",
    resource_name: "Barbell Station",
    equipment_ids: ["eq-1", "eq-2"],
    constraint: "no_superset",
    notes: "",
    ...overrides,
  };
}

export function makeConflict(overrides: Partial<EquipmentConflict> = {}): EquipmentConflict {
  return {
    id: nextId(),
    gym_id: "gym-1",
    equipment_a: "eq-a",
    equipment_b: "eq-b",
    reason: "Same barbell",
    ...overrides,
  };
}

export function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: nextId(),
    profile_id: "profile-1",
    gym_id: "gym-1",
    style: "strength",
    duration_min: 60,
    target_rpe: 7,
    body_groups: ["chest", "back"],
    parameters: {},
    content: "# Workout\nBench Press 3x10",
    structured: {
      warmup: [{ name: "Arm circles", detail: "30s" }],
      blocks: [
        {
          name: "Block A — Chest",
          format: "straight",
          exercises: [
            { name: "Bench Press", sets: "3", reps: "10", rest: "90s" },
          ],
        },
      ],
      cooldown: [{ name: "Stretch", detail: "5 min" }],
      coaching: ["Focus on form"],
    },
    model_used: "claude-sonnet-4-20250514",
    prompt_tokens: 500,
    completion_tokens: 1000,
    rating: null,
    notes: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeEntitlement(overrides: Partial<Entitlement> = {}): Entitlement {
  return {
    id: nextId(),
    user_id: "user-123",
    plan: "free",
    free_generations_used: 0,
    daily_generations_used: 0,
    last_generation_date: "2025-01-01",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: nextId(),
    user_id: "user-123",
    stripe_payment_id: "pi_test_123",
    amount: 999,
    status: "completed",
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}
