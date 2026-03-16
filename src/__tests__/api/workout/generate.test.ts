import { describe, it, expect, vi, beforeEach } from "vitest";

let mockIsHosted = false;
vi.mock("@/lib/config", () => ({
  config: {
    get isHosted() { return mockIsHosted; },
    get isSelfHosted() { return !mockIsHosted; },
    anthropic: { apiKey: "sk-test" },
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

const mockStreamObject = vi.fn();
vi.mock("ai", () => ({
  streamObject: (...args: unknown[]) => mockStreamObject(...args),
}));

const mockGetAIClient = vi.fn().mockReturnValue((model: string) => ({ model }));
vi.mock("@/lib/ai/client", () => ({
  getAIClient: (...args: unknown[]) => mockGetAIClient(...args),
  DEFAULT_MODEL: "claude-sonnet-4-20250514",
}));

vi.mock("@/lib/ai/prompts", () => ({
  buildSystemPrompt: () => "system prompt",
  buildUserPrompt: () => "user prompt",
}));

vi.mock("@/lib/ai/schemas", () => ({
  generateWorkoutSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: {
        profile_id: "p1",
        gym_id: "g1",
        style: "strength",
        duration_min: 60,
        target_rpe: 7,
        body_groups: ["chest"],
        parameters: {},
      },
    }),
  },
  workoutOutputSchema: {},
}));

import { POST } from "@/app/api/workout/generate/route";

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/workout/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/workout/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsHosted = false;
    mockStreamObject.mockReturnValue({
      toTextStreamResponse: () => new Response("streaming..."),
    });
  });

  describe("self-hosted mode", () => {
    it("skips auth and rate-limit", async () => {
      const req = makeRequest({ profile_id: "p1", gym_id: "g1", style: "strength", duration_min: 60, target_rpe: 7, body_groups: ["chest"] });
      await POST(req);
      expect(mockRequireAuth).not.toHaveBeenCalled();
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid body", async () => {
      const { generateWorkoutSchema } = await import("@/lib/ai/schemas");
      (generateWorkoutSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        success: false,
        error: { flatten: () => ({ fieldErrors: {} }) },
      });
      const req = makeRequest({});
      const res = (await POST(req))!;
      expect(res.status).toBe(400);
    });

    it("returns 401 when no API key", async () => {
      // Temporarily override config
      vi.doMock("@/lib/config", () => ({
        config: {
          get isHosted() { return false; },
          get isSelfHosted() { return true; },
          anthropic: { apiKey: "" },
        },
      }));
      vi.resetModules();
      const { POST: freshPOST } = await import("@/app/api/workout/generate/route");
      const req = makeRequest({ profile_id: "p1", gym_id: "g1", style: "strength", duration_min: 60, target_rpe: 7, body_groups: ["chest"] });
      const res = (await freshPOST(req))!;
      expect(res.status).toBe(401);
    });

    it("calls streamObject", async () => {
      const req = makeRequest({ profile_id: "p1", gym_id: "g1", style: "strength", duration_min: 60, target_rpe: 7, body_groups: ["chest"] });
      await POST(req);
      expect(mockStreamObject).toHaveBeenCalled();
    });

    it("returns stream response", async () => {
      const req = makeRequest({ profile_id: "p1", gym_id: "g1", style: "strength", duration_min: 60, target_rpe: 7, body_groups: ["chest"] });
      const res = (await POST(req))!;
      expect(res).toBeInstanceOf(Response);
    });

    it("returns 500 on error", async () => {
      mockStreamObject.mockImplementation(() => {
        throw new Error("AI Error");
      });
      const req = makeRequest({ profile_id: "p1", gym_id: "g1", style: "strength", duration_min: 60, target_rpe: 7, body_groups: ["chest"] });
      const res = (await POST(req))!;
      expect(res.status).toBe(500);
    });
  });

  describe("hosted mode", () => {
    beforeEach(() => {
      mockIsHosted = true;
      mockRequireAuth.mockResolvedValue({ user: { id: "user-123" }, supabase: {} });
    });

    it("returns 401 when unauthenticated", async () => {
      mockRequireAuth.mockResolvedValue({
        error: Response.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const req = makeRequest({ profile_id: "p1", gym_id: "g1", style: "strength", duration_min: 60, target_rpe: 7, body_groups: ["chest"] });
      const res = (await POST(req))!;
      expect(res.status).toBe(401);
    });

    it("calls check_and_increment RPC", async () => {
      mockRpc.mockResolvedValue({ data: { allowed: true, plan: "free", used: 1, limit: 3 }, error: null });
      const req = makeRequest({ profile_id: "p1", gym_id: "g1", style: "strength", duration_min: 60, target_rpe: 7, body_groups: ["chest"] });
      await POST(req);
      expect(mockRpc).toHaveBeenCalledWith("check_and_increment_generation", { p_user_id: "user-123", p_timezone: "UTC" });
    });

    it("returns 403 with free message when free limit reached", async () => {
      mockRpc.mockResolvedValue({ data: { allowed: false, plan: "free", used: 3, limit: 3 }, error: null });
      const req = makeRequest({ profile_id: "p1", gym_id: "g1", style: "strength", duration_min: 60, target_rpe: 7, body_groups: ["chest"] });
      const res = (await POST(req))!;
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("free generations");
    });

    it("returns 403 with paid message when daily limit reached", async () => {
      mockRpc.mockResolvedValue({ data: { allowed: false, plan: "paid", used: 3, limit: 3 }, error: null });
      const req = makeRequest({ profile_id: "p1", gym_id: "g1", style: "strength", duration_min: 60, target_rpe: 7, body_groups: ["chest"] });
      const res = (await POST(req))!;
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Daily generation limit");
    });

    it("proceeds when allowed", async () => {
      mockRpc.mockResolvedValue({ data: { allowed: true, plan: "paid", used: 1, limit: 3 }, error: null });
      const req = makeRequest({ profile_id: "p1", gym_id: "g1", style: "strength", duration_min: 60, target_rpe: 7, body_groups: ["chest"] });
      await POST(req);
      expect(mockStreamObject).toHaveBeenCalled();
    });
  });
});
