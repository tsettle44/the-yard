import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUser = { id: "user-123" };
const mockFrom = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

import { GET, POST } from "@/app/api/workouts/route";

describe("GET /api/workouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      user: mockUser,
      supabase: { from: mockFrom },
    });
  });

  it("requires authentication", async () => {
    mockRequireAuth.mockResolvedValue({
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns empty array when no profiles or gyms", async () => {
    const chain: Record<string, any> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("queries workouts for user profiles", async () => {
    let fromCalls: string[] = [];

    mockFrom.mockImplementation((table: string) => {
      fromCalls.push(table);
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockReturnValue(chain);
      chain.is = vi.fn().mockReturnValue(chain);
      chain.or = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockResolvedValue({ data: [{ id: "w1" }], error: null });

      if (table === "profiles") {
        chain.eq.mockResolvedValue({ data: [{ id: "p1" }], error: null });
      } else if (table === "gyms") {
        chain.eq.mockResolvedValue({ data: [{ id: "g1" }], error: null });
      }
      return chain;
    });

    const res = await GET();
    const body = await res.json();
    expect(fromCalls).toContain("profiles");
    expect(fromCalls).toContain("gyms");
    expect(fromCalls).toContain("workouts");
  });

  it("orders by created_at descending", async () => {
    let orderCalled = false;
    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockReturnValue(chain);
      chain.or = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockImplementation((col: string, opts: any) => {
        if (table === "workouts") {
          orderCalled = true;
          expect(col).toBe("created_at");
          expect(opts).toEqual({ ascending: false });
        }
        return Promise.resolve({ data: [], error: null });
      });

      if (table === "profiles") {
        chain.eq.mockResolvedValue({ data: [{ id: "p1" }], error: null });
      } else if (table === "gyms") {
        chain.eq.mockResolvedValue({ data: [], error: null });
      }
      return chain;
    });

    await GET();
    expect(orderCalled).toBe(true);
  });

  it("returns 500 on DB error", async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockReturnValue(chain);
      chain.or = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } });

      if (table === "profiles") {
        chain.eq.mockResolvedValue({ data: [{ id: "p1" }], error: null });
      } else if (table === "gyms") {
        chain.eq.mockResolvedValue({ data: [], error: null });
      }
      return chain;
    });

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/workouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      user: mockUser,
      supabase: { from: mockFrom },
    });
  });

  it("requires authentication", async () => {
    mockRequireAuth.mockResolvedValue({
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ gym_id: "g1", style: "strength" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("creates workout with all fields", async () => {
    const chain: Record<string, any> = {};
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: { id: "w1" }, error: null });
    mockFrom.mockReturnValue(chain);

    const body = {
      profile_id: "p1",
      gym_id: "g1",
      style: "strength",
      duration_min: 60,
      target_rpe: 7,
      body_groups: ["chest"],
      content: "test",
      structured: { blocks: [] },
    };
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(body),
    });
    await POST(req);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: "p1",
        gym_id: "g1",
        style: "strength",
      })
    );
  });

  it("allows null profile_id", async () => {
    const chain: Record<string, any> = {};
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: { id: "w1" }, error: null });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ gym_id: "g1", style: "strength" }),
    });
    await POST(req);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ profile_id: null })
    );
  });

  it("applies defaults", async () => {
    const chain: Record<string, any> = {};
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: { id: "w1" }, error: null });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ gym_id: "g1", style: "strength" }),
    });
    await POST(req);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: {},
        content: "",
        structured: null,
        model_used: "",
        prompt_tokens: 0,
        completion_tokens: 0,
        rating: null,
        notes: null,
      })
    );
  });

  it("returns 201 on success", async () => {
    const chain: Record<string, any> = {};
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: { id: "w1" }, error: null });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ gym_id: "g1", style: "strength" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("returns 500 on DB error", async () => {
    const chain: Record<string, any> = {};
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ gym_id: "g1", style: "strength" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
