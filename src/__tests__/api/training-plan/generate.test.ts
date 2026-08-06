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

const mockStreamObject = vi.fn();
vi.mock("ai", () => ({
  streamObject: (...args: unknown[]) => mockStreamObject(...args),
}));

const mockGetAIClient = vi.fn().mockReturnValue((model: string) => ({ model }));
vi.mock("@/lib/ai/client", () => ({
  getAIClient: (...args: unknown[]) => mockGetAIClient(...args),
  DEFAULT_MODEL: "claude-sonnet-4-20250514",
}));

vi.mock("@/lib/ai/training-plan-prompts", () => ({
  buildTrainingPlanSystemPrompt: () => "system prompt",
  buildTrainingPlanUserPrompt: () => "user prompt",
}));

vi.mock("@/lib/ai/training-plan-schemas", () => ({
  generateTrainingPlanSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: {
        event_type: "marathon",
        event_name: "Test Marathon",
        event_date: "2026-10-11",
        experience_level: "intermediate",
        available_days: ["monday", "wednesday", "friday"],
        hours_per_day: 1,
        goals: "",
        current_fitness: "",
        injuries_limitations: "",
        additional_notes: "",
      },
    }),
  },
  trainingPlanOutputSchema: {},
}));

import { POST } from "@/app/api/training-plan/generate/route";

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/training-plan/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  event_type: "marathon",
  event_name: "Test Marathon",
  event_date: "2026-10-11",
  experience_level: "intermediate",
  available_days: ["monday", "wednesday", "friday"],
  hours_per_day: 1,
};

describe("POST /api/training-plan/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsHosted = false;
    mockStreamObject.mockReturnValue({
      toTextStreamResponse: () => new Response("streaming..."),
    });
  });

  describe("self-hosted mode", () => {
    it("skips auth", async () => {
      const req = makeRequest(validBody);
      await POST(req);
      expect(mockRequireAuth).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid body", async () => {
      const { generateTrainingPlanSchema } = await import("@/lib/ai/training-plan-schemas");
      (generateTrainingPlanSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        success: false,
        error: { flatten: () => ({ fieldErrors: {} }) },
      });
      const req = makeRequest({});
      const res = (await POST(req))!;
      expect(res.status).toBe(400);
    });

    it("returns 401 when no API key", async () => {
      vi.doMock("@/lib/config", () => ({
        config: {
          get isHosted() { return false; },
          get isSelfHosted() { return true; },
          anthropic: { apiKey: "" },
        },
      }));
      vi.resetModules();
      const { POST: freshPOST } = await import("@/app/api/training-plan/generate/route");
      const req = makeRequest(validBody);
      const res = (await freshPOST(req))!;
      expect(res.status).toBe(401);
    });

    it("calls streamObject with correct args", async () => {
      const req = makeRequest(validBody);
      await POST(req);
      expect(mockStreamObject).toHaveBeenCalledWith(
        expect.objectContaining({
          system: "system prompt",
          prompt: "user prompt",
        })
      );
    });

    it("returns stream response", async () => {
      const req = makeRequest(validBody);
      const res = (await POST(req))!;
      expect(res).toBeInstanceOf(Response);
      const text = await res.text();
      expect(text).toBe("streaming...");
    });

    it("passes equipment data in request body", async () => {
      const equipmentData = [{ id: "e1", name: "Barbell", category: "strength" }];
      const req = makeRequest({
        ...validBody,
        equipment_data: equipmentData,
      });
      await POST(req);
      expect(mockStreamObject).toHaveBeenCalled();
    });

    it("returns 500 on error", async () => {
      mockStreamObject.mockImplementation(() => {
        throw new Error("AI Error");
      });
      const req = makeRequest(validBody);
      const res = (await POST(req))!;
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Failed to generate training plan");
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
      const req = makeRequest(validBody);
      const res = (await POST(req))!;
      expect(res.status).toBe(401);
    });

    it("proceeds when authenticated", async () => {
      const req = makeRequest(validBody);
      await POST(req);
      expect(mockStreamObject).toHaveBeenCalled();
    });
  });
});
