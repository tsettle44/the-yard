import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GroupWorkoutOutput } from "@/lib/ai/schemas";

let mockIsHosted = false;
let mockApiKey = "sk-test";
vi.mock("@/lib/config", () => ({
  config: {
    get isHosted() { return mockIsHosted; },
    get isSelfHosted() { return !mockIsHosted; },
    anthropic: { get apiKey() { return mockApiKey; } },
  },
}));

const mockRequireAuth = vi.fn();
vi.mock("@/lib/api/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

const mockRpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mockRpc }),
}));

const mockGenerateObject = vi.fn();
vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => mockGenerateObject(...args),
}));

vi.mock("@/lib/ai/client", () => ({
  getAIClient: () => (model: string) => ({ model }),
  DEFAULT_MODEL: "claude-haiku-4-5-20251001",
  getModelId: () => "claude-haiku-4-5-20251001",
}));

import { POST } from "@/app/api/workout/generate-group/route";

const equipment = [
  { id: "barbell", gym_id: "g", slug: "barbell", name: "Barbell", category: "strength", attributes: {}, quantity: 1 },
  { id: "db", gym_id: "g", slug: "db", name: "Dumbbells", category: "strength", attributes: {}, quantity: 2 },
];

function plan(a0: string[], a1: string[]): GroupWorkoutOutput {
  const asg = (person: number, ids: string[]) => ({
    person, name: `Ex ${person}`, sets: "3", reps: "10", rest: "60s", equipment_ids: ids,
  });
  return {
    warmup: [],
    blocks: [{ name: "Block A", format: "straight", slots: [{ assignments: [asg(0, a0), asg(1, a1)] }] }],
    cooldown: [],
    coaching: [],
  };
}

const validPlan = plan(["barbell"], ["db"]);
const conflictPlan = plan(["barbell"], ["barbell"]);

function makeRequest(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/workout/generate-group", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile_id: "p1",
      gym_id: "g1",
      style: "strength",
      duration_min: 45,
      target_rpe: 7,
      body_groups: ["full_body"],
      group_size: 2,
      equipment_data: equipment,
      shared_resources_data: [],
      ...overrides,
    }),
  });
}

describe("POST /api/workout/generate-group", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsHosted = false;
    mockApiKey = "sk-test";
    mockGenerateObject.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("self-hosted mode", () => {
    it("skips auth and rate-limit", async () => {
      mockGenerateObject.mockResolvedValue({ object: validPlan });
      (await POST(makeRequest()))!;
      expect(mockRequireAuth).not.toHaveBeenCalled();
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid body (group_size out of range)", async () => {
      const res = (await POST(makeRequest({ group_size: 7 })))!;
      expect(res.status).toBe(400);
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it("returns 400 when group_size is missing", async () => {
      const res = (await POST(makeRequest({ group_size: undefined })))!;
      expect(res.status).toBe(400);
    });

    it("returns 401 when no API key", async () => {
      mockApiKey = "";
      const res = (await POST(makeRequest()))!;
      expect(res.status).toBe(401);
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it("returns the workout when valid on the first try", async () => {
      mockGenerateObject.mockResolvedValue({ object: validPlan });
      const res = (await POST(makeRequest()))!;
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ workout: validPlan });
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
      const call = mockGenerateObject.mock.calls[0][0];
      expect(call.prompt).toContain('id: "barbell"');
      expect(call.prompt).toContain("quantity: 1");
      expect(call.system).toContain("GROUP WORKOUT MODEL");
      expect(call.prompt).not.toContain("REJECTED");
    });

    it("retries with violations in the prompt, then succeeds", async () => {
      mockGenerateObject
        .mockResolvedValueOnce({ object: conflictPlan })
        .mockResolvedValueOnce({ object: validPlan });
      const res = (await POST(makeRequest()))!;
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ workout: validPlan });
      expect(mockGenerateObject).toHaveBeenCalledTimes(2);

      const retryPrompt = mockGenerateObject.mock.calls[1][0].prompt as string;
      expect(retryPrompt).toContain("REJECTED");
      expect(retryPrompt).toContain("Block 1");
      expect(retryPrompt).toContain("slot 1");
      expect(retryPrompt).toContain("Barbell");
      expect(retryPrompt).toContain("only 1 available");
    });

    it("succeeds on the third attempt", async () => {
      mockGenerateObject
        .mockResolvedValueOnce({ object: conflictPlan })
        .mockResolvedValueOnce({ object: conflictPlan })
        .mockResolvedValueOnce({ object: validPlan });
      const res = (await POST(makeRequest()))!;
      expect(res.status).toBe(200);
      expect(mockGenerateObject).toHaveBeenCalledTimes(3);
    });

    it("returns 422 with violations after 3 invalid attempts, never the plan", async () => {
      mockGenerateObject.mockResolvedValue({ object: conflictPlan });
      const res = (await POST(makeRequest()))!;
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toBeTruthy();
      expect(body.workout).toBeUndefined();
      expect(body.violations.length).toBeGreaterThan(0);
      expect(body.violations[0]).toContain("Barbell");
      expect(mockGenerateObject).toHaveBeenCalledTimes(3);
    });

    it("validates against the bodyweight rule", async () => {
      mockGenerateObject
        .mockResolvedValueOnce({ object: plan(["db"], []) })
        .mockResolvedValueOnce({ object: plan([], []) });
      const res = (await POST(makeRequest({ bodyweight: true, gym_id: null })))!;
      expect(res.status).toBe(200);
      const first = mockGenerateObject.mock.calls[0][0];
      expect(first.system).toContain("BODYWEIGHT-ONLY");
      expect(mockGenerateObject.mock.calls[1][0].prompt).toContain("bodyweight-only workout");
    });

    it("ignores client equipment in bodyweight mode", async () => {
      mockGenerateObject.mockResolvedValue({ object: plan(["barbell"], []) });
      const res = (await POST(makeRequest({ bodyweight: true, gym_id: null })))!;
      expect(res.status).toBe(422);
    });

    it("enforces shared resource rules", async () => {
      const shared = [{
        id: "sr1", gym_id: "g", resource_name: "Rack", equipment_ids: ["barbell", "db"], constraint: "no_superset",
      }];
      mockGenerateObject.mockResolvedValue({ object: validPlan });
      const res = (await POST(makeRequest({ shared_resources_data: shared })))!;
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.violations[0]).toContain("no_superset");
    });

    it("retries when the model output does not match the schema", async () => {
      const schemaError = Object.assign(new Error("No object generated"), { name: "AI_NoObjectGeneratedError" });
      mockGenerateObject
        .mockRejectedValueOnce(schemaError)
        .mockResolvedValueOnce({ object: validPlan });
      const res = (await POST(makeRequest()))!;
      expect(res.status).toBe(200);
      expect(mockGenerateObject.mock.calls[1][0].prompt).toContain("did not match the required JSON schema");
    });

    it("passes a time-bounded abort signal and output cap", async () => {
      mockGenerateObject.mockResolvedValue({ object: validPlan });
      (await POST(makeRequest()))!;
      const call = mockGenerateObject.mock.calls[0][0];
      expect(call.abortSignal).toBeInstanceOf(AbortSignal);
      expect(call.maxOutputTokens).toBeGreaterThan(0);
    });

    it("returns 504 on timeout and never a plan", async () => {
      const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
      mockGenerateObject.mockRejectedValue(timeout);
      const res = (await POST(makeRequest()))!;
      expect(res.status).toBe(504);
      expect((await res.json()).workout).toBeUndefined();
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });

    it("returns 500 on unexpected error", async () => {
      mockGenerateObject.mockRejectedValue(new Error("AI Error"));
      const res = (await POST(makeRequest()))!;
      expect(res.status).toBe(500);
    });
  });

  describe("hosted mode", () => {
    beforeEach(() => {
      mockIsHosted = true;
      mockRequireAuth.mockResolvedValue({ user: { id: "user-123" }, supabase: {} });
      mockGenerateObject.mockResolvedValue({ object: validPlan });
    });

    it("returns 401 when unauthenticated", async () => {
      mockRequireAuth.mockResolvedValue({
        error: Response.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const res = (await POST(makeRequest()))!;
      expect(res.status).toBe(401);
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it("calls check_and_increment RPC once, even with retries", async () => {
      mockRpc.mockResolvedValue({ data: { allowed: true, plan: "free", used: 1, limit: 3 }, error: null });
      mockGenerateObject
        .mockResolvedValueOnce({ object: conflictPlan })
        .mockResolvedValueOnce({ object: conflictPlan })
        .mockResolvedValueOnce({ object: validPlan });
      (await POST(makeRequest({ timezone: "America/Chicago" })))!;
      expect(mockRpc).toHaveBeenCalledTimes(1);
      expect(mockRpc).toHaveBeenCalledWith("check_and_increment_generation", {
        p_user_id: "user-123",
        p_timezone: "America/Chicago",
      });
    });

    it("defaults timezone to UTC", async () => {
      mockRpc.mockResolvedValue({ data: { allowed: true, plan: "paid", used: 1, limit: 3 }, error: null });
      (await POST(makeRequest()))!;
      expect(mockRpc).toHaveBeenCalledWith("check_and_increment_generation", { p_user_id: "user-123", p_timezone: "UTC" });
    });

    it("returns 403 with free message when free limit reached", async () => {
      mockRpc.mockResolvedValue({ data: { allowed: false, plan: "free", used: 3, limit: 3 }, error: null });
      const res = (await POST(makeRequest()))!;
      expect(res.status).toBe(403);
      expect((await res.json()).error).toContain("free generations");
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it("returns 403 with paid message when daily limit reached", async () => {
      mockRpc.mockResolvedValue({ data: { allowed: false, plan: "paid", used: 3, limit: 3 }, error: null });
      const res = (await POST(makeRequest()))!;
      expect(res.status).toBe(403);
      expect((await res.json()).error).toContain("Daily generation limit");
    });

    it("returns 500 when the entitlement check fails", async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });
      const res = (await POST(makeRequest()))!;
      expect(res.status).toBe(500);
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it("does not consume a generation for an invalid request", async () => {
      const res = (await POST(makeRequest({ group_size: 1 })))!;
      expect(res.status).toBe(400);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("proceeds and returns the workout when allowed", async () => {
      mockRpc.mockResolvedValue({ data: { allowed: true, plan: "paid", used: 1, limit: 3 }, error: null });
      const res = (await POST(makeRequest()))!;
      expect(res.status).toBe(200);
      expect((await res.json()).workout).toEqual(validPlan);
    });
  });
});
