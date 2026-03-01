import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUser = { id: "user-123" };
const mockFrom = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

import { GET, POST } from "@/app/api/profiles/route";

function makeChain(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockResolvedValue({ data, error });
  chain.single = vi.fn().mockResolvedValue({ data, error });
  mockFrom.mockReturnValue(chain);
  return chain;
}

describe("GET /api/profiles", () => {
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
    const res = (await GET())!;
    expect(res.status).toBe(401);
  });

  it("orders by created_at ascending", async () => {
    const chain = makeChain([]);
    await GET();
    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: true });
  });

  it("returns empty array when no profiles", async () => {
    makeChain([]);
    const res = (await GET())!;
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    makeChain(null, { message: "DB error" });
    const res = (await GET())!;
    expect(res.status).toBe(500);
  });
});

describe("POST /api/profiles", () => {
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
    const req = new Request("http://localhost/api/profiles", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    const res = (await POST(req))!;
    expect(res.status).toBe(401);
  });

  it("sets user_id from auth", async () => {
    const chain = makeChain({ id: "p1", user_id: "user-123", name: "Test" });
    const req = new Request("http://localhost/api/profiles", {
      method: "POST",
      body: JSON.stringify({ name: "Test", fitness_level: "beginner" }),
    });
    await POST(req);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-123" })
    );
  });

  it("returns 201 on success", async () => {
    makeChain({ id: "p1", name: "Test" });
    const req = new Request("http://localhost/api/profiles", {
      method: "POST",
      body: JSON.stringify({ name: "Test", fitness_level: "beginner" }),
    });
    const res = (await POST(req))!;
    expect(res.status).toBe(201);
  });

  it("unsets other defaults when is_default=true", async () => {
    const chain = makeChain({ id: "p1" });
    const req = new Request("http://localhost/api/profiles", {
      method: "POST",
      body: JSON.stringify({ name: "Test", fitness_level: "beginner", is_default: true }),
    });
    await POST(req);
    expect(chain.update).toHaveBeenCalledWith({ is_default: false });
  });

  it("applies field defaults", async () => {
    const chain = makeChain({ id: "p1" });
    const req = new Request("http://localhost/api/profiles", {
      method: "POST",
      body: JSON.stringify({ name: "Test", fitness_level: "beginner" }),
    });
    await POST(req);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        preferred_styles: [],
        goals: "",
        preferences: {},
        is_default: false,
      })
    );
  });

  it("returns 500 on DB error", async () => {
    makeChain(null, { message: "DB error" });
    const req = new Request("http://localhost/api/profiles", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    const res = (await POST(req))!;
    expect(res.status).toBe(500);
  });
});
