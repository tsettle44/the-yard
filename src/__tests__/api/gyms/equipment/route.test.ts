import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUser = { id: "user-123" };
const mockFrom = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

import { POST } from "@/app/api/gyms/[id]/equipment/route";

const params = Promise.resolve({ id: "gym-1" });

describe("POST /api/gyms/:id/equipment", () => {
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
      body: JSON.stringify({ slug: "barbell", name: "Barbell", category: "strength" }),
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when gym not owned", async () => {
    const gymChain: Record<string, any> = {};
    gymChain.select = vi.fn().mockReturnValue(gymChain);
    gymChain.eq = vi.fn().mockReturnValue(gymChain);
    gymChain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(gymChain);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ slug: "barbell", name: "Barbell", category: "strength" }),
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(404);
  });

  it("creates equipment with fields", async () => {
    // Gym ownership check
    const gymChain: Record<string, any> = {};
    gymChain.select = vi.fn().mockReturnValue(gymChain);
    gymChain.eq = vi.fn().mockReturnValue(gymChain);
    gymChain.single = vi.fn().mockResolvedValue({ data: { id: "gym-1" }, error: null });

    // Equipment insert
    const eqChain: Record<string, any> = {};
    eqChain.insert = vi.fn().mockReturnValue(eqChain);
    eqChain.select = vi.fn().mockReturnValue(eqChain);
    eqChain.single = vi.fn().mockResolvedValue({
      data: { id: "eq-1", slug: "barbell", name: "Barbell", quantity: 1 },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "gyms") return gymChain;
      return eqChain;
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ slug: "barbell", name: "Barbell", category: "strength" }),
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(201);
    expect(eqChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        gym_id: "gym-1",
        slug: "barbell",
        name: "Barbell",
        category: "strength",
        attributes: {},
        quantity: 1,
      })
    );
  });

  it("defaults quantity to 1 and attributes to {}", async () => {
    const gymChain: Record<string, any> = {};
    gymChain.select = vi.fn().mockReturnValue(gymChain);
    gymChain.eq = vi.fn().mockReturnValue(gymChain);
    gymChain.single = vi.fn().mockResolvedValue({ data: { id: "gym-1" }, error: null });

    const eqChain: Record<string, any> = {};
    eqChain.insert = vi.fn().mockReturnValue(eqChain);
    eqChain.select = vi.fn().mockReturnValue(eqChain);
    eqChain.single = vi.fn().mockResolvedValue({ data: { id: "eq-1" }, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "gyms") return gymChain;
      return eqChain;
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ slug: "barbell", name: "Barbell", category: "strength" }),
    });
    await POST(req, { params });
    expect(eqChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 1, attributes: {} })
    );
  });

  it("returns 500 on DB error", async () => {
    const gymChain: Record<string, any> = {};
    gymChain.select = vi.fn().mockReturnValue(gymChain);
    gymChain.eq = vi.fn().mockReturnValue(gymChain);
    gymChain.single = vi.fn().mockResolvedValue({ data: { id: "gym-1" }, error: null });

    const eqChain: Record<string, any> = {};
    eqChain.insert = vi.fn().mockReturnValue(eqChain);
    eqChain.select = vi.fn().mockReturnValue(eqChain);
    eqChain.single = vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "gyms") return gymChain;
      return eqChain;
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ slug: "barbell", name: "Barbell", category: "strength" }),
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(500);
  });
});
