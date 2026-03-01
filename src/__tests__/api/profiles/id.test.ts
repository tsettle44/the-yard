import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUser = { id: "user-123" };
const mockFrom = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

import { PATCH, DELETE } from "@/app/api/profiles/[id]/route";

function makeChain(data: unknown, error: unknown = null) {
  const chain: Record<string, any> = {};
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data, error });
  mockFrom.mockReturnValue(chain);
  return chain;
}

const params = Promise.resolve({ id: "profile-1" });

describe("PATCH /api/profiles/:id", () => {
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
      body: JSON.stringify({ name: "Updated" }),
    });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(401);
  });

  it("updates profile fields", async () => {
    const chain = makeChain({ id: "profile-1", name: "Updated" });
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
    });
    await PATCH(req, { params });
    expect(chain.update).toHaveBeenCalledWith({ name: "Updated" });
  });

  it("scopes to user_id", async () => {
    const chain = makeChain({ id: "profile-1" });
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "X" }),
    });
    await PATCH(req, { params });
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-123");
  });

  it("unsets other defaults when is_default=true", async () => {
    const chain = makeChain({ id: "profile-1" });
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ is_default: true }),
    });
    await PATCH(req, { params });
    // Should have called update with is_default: false first
    expect(chain.update).toHaveBeenCalledWith({ is_default: false });
  });

  it("returns 500 on DB error", async () => {
    makeChain(null, { message: "DB error" });
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "X" }),
    });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/profiles/:id", () => {
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

  it("scopes to user_id", async () => {
    const chain = makeChain(null);
    chain.delete.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    // Override to make the last eq resolve
    let eqCalls = 0;
    chain.eq.mockImplementation(() => {
      eqCalls++;
      if (eqCalls >= 2) return Promise.resolve({ error: null });
      return chain;
    });
    const req = new Request("http://localhost", { method: "DELETE" });
    await DELETE(req, { params });
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-123");
  });

  it("returns 204 on success", async () => {
    const chain: Record<string, any> = {};
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    // Make the final eq call resolve
    let eqCount = 0;
    chain.eq.mockImplementation(() => {
      eqCount++;
      if (eqCount >= 2) return Promise.resolve({ error: null });
      return chain;
    });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(204);
  });

  it("returns 500 on DB error", async () => {
    const chain: Record<string, any> = {};
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    let eqCount = 0;
    chain.eq.mockImplementation(() => {
      eqCount++;
      if (eqCount >= 2) return Promise.resolve({ error: { message: "DB error" } });
      return chain;
    });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(500);
  });
});
