import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUser = { id: "user-123" };
const mockFrom = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

import { GET, POST } from "@/app/api/gyms/route";

describe("GET /api/gyms", () => {
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

  it("returns empty array when no gyms", async () => {
    const chain: Record<string, any> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("nests equipment and shared resources", async () => {
    // First call: gyms
    const gymsChain: Record<string, any> = {};
    gymsChain.select = vi.fn().mockReturnValue(gymsChain);
    gymsChain.eq = vi.fn().mockReturnValue(gymsChain);
    gymsChain.order = vi.fn().mockResolvedValue({
      data: [{ id: "gym-1", user_id: "user-123", name: "Test Gym" }],
      error: null,
    });

    // Equipment chain
    const eqChain: Record<string, any> = {};
    eqChain.select = vi.fn().mockReturnValue(eqChain);
    eqChain.in = vi.fn().mockResolvedValue({
      data: [{ id: "eq-1", gym_id: "gym-1", slug: "barbell", name: "Barbell" }],
      error: null,
    });

    // Shared resources chain
    const srChain: Record<string, any> = {};
    srChain.select = vi.fn().mockReturnValue(srChain);
    srChain.in = vi.fn().mockResolvedValue({
      data: [{ id: "sr-1", gym_id: "gym-1", resource_name: "Station", equipment_ids: ["eq-1"], constraint_type: "no_superset", notes: "" }],
      error: null,
    });

    let fromCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      fromCalls++;
      if (table === "gyms") return gymsChain;
      if (table === "equipment") return eqChain;
      if (table === "shared_resource_groups") return srChain;
      return gymsChain;
    });

    const res = await GET();
    const body = await res.json();
    expect(body[0].equipment).toBeDefined();
    expect(body[0].shared_resources).toBeDefined();
  });

  it("maps constraint_type to constraint", async () => {
    const gymsChain: Record<string, any> = {};
    gymsChain.select = vi.fn().mockReturnValue(gymsChain);
    gymsChain.eq = vi.fn().mockReturnValue(gymsChain);
    gymsChain.order = vi.fn().mockResolvedValue({
      data: [{ id: "gym-1", user_id: "user-123", name: "Gym" }],
      error: null,
    });

    const eqChain: Record<string, any> = {};
    eqChain.select = vi.fn().mockReturnValue(eqChain);
    eqChain.in = vi.fn().mockResolvedValue({ data: [], error: null });

    const srChain: Record<string, any> = {};
    srChain.select = vi.fn().mockReturnValue(srChain);
    srChain.in = vi.fn().mockResolvedValue({
      data: [{ id: "sr-1", gym_id: "gym-1", resource_name: "X", equipment_ids: [], constraint_type: "group_together", notes: "" }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "gyms") return gymsChain;
      if (table === "equipment") return eqChain;
      return srChain;
    });

    const res = await GET();
    const body = await res.json();
    expect(body[0].shared_resources[0].constraint).toBe("group_together");
  });

  it("returns 500 on DB error", async () => {
    const chain: Record<string, any> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } });
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/gyms", () => {
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
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("creates gym with name and default layout_notes", async () => {
    const chain: Record<string, any> = {};
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({
      data: { id: "g1", name: "My Gym", layout_notes: "" },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "My Gym" }),
    });
    await POST(req);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-123", name: "My Gym", layout_notes: "" })
    );
  });

  it("returns 201 with empty nested arrays", async () => {
    const chain: Record<string, any> = {};
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({
      data: { id: "g1", name: "Gym" },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "Gym" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.equipment).toEqual([]);
    expect(body.shared_resources).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    const chain: Record<string, any> = {};
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "Gym" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
