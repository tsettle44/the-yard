import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUser = { id: "user-123" };
const mockFrom = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

import { PATCH, DELETE } from "@/app/api/workouts/[id]/route";

const params = Promise.resolve({ id: "w-1" });

describe("PATCH /api/workouts/:id", () => {
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
      method: "PATCH",
      body: JSON.stringify({ rating: 5 }),
    });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(401);
  });

  it("updates rating", async () => {
    const chain: Record<string, any> = {};
    chain.update = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: { id: "w-1", rating: 5 }, error: null });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ rating: 5 }),
    });
    await PATCH(req, { params });
    expect(chain.update).toHaveBeenCalledWith({ rating: 5 });
  });

  it("updates notes", async () => {
    const chain: Record<string, any> = {};
    chain.update = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: { id: "w-1" }, error: null });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ notes: "Great workout" }),
    });
    await PATCH(req, { params });
    expect(chain.update).toHaveBeenCalledWith({ notes: "Great workout" });
  });

  it("only allows rating and notes fields", async () => {
    const chain: Record<string, any> = {};
    chain.update = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: { id: "w-1" }, error: null });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ rating: 5, style: "hiit", content: "hacked" }),
    });
    await PATCH(req, { params });
    // Only rating should be in the update, style and content are not whitelisted
    expect(chain.update).toHaveBeenCalledWith({ rating: 5 });
  });

  it("returns 500 on DB error", async () => {
    const chain: Record<string, any> = {};
    chain.update = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ rating: 5 }),
    });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/workouts/:id", () => {
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
    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(401);
  });

  it("deletes by id", async () => {
    const chain: Record<string, any> = {};
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", { method: "DELETE" });
    await DELETE(req, { params });
    expect(chain.eq).toHaveBeenCalledWith("id", "w-1");
  });

  it("returns 204 on success", async () => {
    const chain: Record<string, any> = {};
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(204);
  });

  it("returns 500 on DB error", async () => {
    const chain: Record<string, any> = {};
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockResolvedValue({ error: { message: "fail" } });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(500);
  });
});
