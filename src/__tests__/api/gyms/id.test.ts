import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUser = { id: "user-123" };
const mockFrom = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

import { PATCH, DELETE } from "@/app/api/gyms/[id]/route";

const params = Promise.resolve({ id: "gym-1" });

function makeChain(data: unknown, error: unknown = null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data, error });
  mockFrom.mockReturnValue(chain);
  return chain;
}

describe("PATCH /api/gyms/:id", () => {
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
    const res = (await PATCH(req, { params }))!;
    expect(res.status).toBe(401);
  });

  it("only allows name and layout_notes fields", async () => {
    const chain = makeChain({ id: "gym-1" });
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name", layout_notes: "Notes", user_id: "hacker" }),
    });
    await PATCH(req, { params });
    expect(chain.update).toHaveBeenCalledWith({ name: "New Name", layout_notes: "Notes" });
  });

  it("scopes to user_id", async () => {
    const chain = makeChain({ id: "gym-1" });
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "X" }),
    });
    await PATCH(req, { params });
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-123");
  });

  it("returns 500 on DB error", async () => {
    makeChain(null, { message: "DB error" });
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "X" }),
    });
    const res = (await PATCH(req, { params }))!;
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/gyms/:id", () => {
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
    const res = (await DELETE(req, { params }))!;
    expect(res.status).toBe(401);
  });

  it("returns 204 on success", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: Record<string, any> = {};
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    let eqCount = 0;
    chain.eq.mockImplementation(() => {
      eqCount++;
      if (eqCount >= 2) return Promise.resolve({ error: null });
      return chain;
    });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = (await DELETE(req, { params }))!;
    expect(res.status).toBe(204);
  });

  it("returns 500 on DB error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: Record<string, any> = {};
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    let eqCount = 0;
    chain.eq.mockImplementation(() => {
      eqCount++;
      if (eqCount >= 2) return Promise.resolve({ error: { message: "fail" } });
      return chain;
    });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = (await DELETE(req, { params }))!;
    expect(res.status).toBe(500);
  });
});
