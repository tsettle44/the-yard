import { describe, it, expect, vi, beforeEach } from "vitest";

let mockIsHosted = true;
vi.mock("@/lib/config", () => ({
  config: {
    get isHosted() { return mockIsHosted; },
    get isSelfHosted() { return !mockIsHosted; },
    freeGenerations: 3,
    dailyGenerationLimit: 3,
  },
}));

const mockUser = { id: "user-123" };
const mockRequireAuth = vi.fn();
vi.mock("@/lib/api/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

const mockAdminFrom = vi.fn();
const mockAdminUpsert = vi.fn();
const mockAdminSelect = vi.fn();
const mockAdminSingle = vi.fn();
const mockAdminEq = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
  }),
}));

import { GET } from "@/app/api/entitlement/route";

function setupChain(data: unknown, error: unknown = null) {
  const chain = {
    upsert: mockAdminUpsert.mockReturnThis(),
    select: mockAdminSelect.mockReturnThis(),
    single: mockAdminSingle.mockResolvedValue({ data, error }),
    eq: mockAdminEq.mockReturnThis(),
  };
  mockAdminFrom.mockReturnValue(chain);
  return chain;
}

describe("GET /api/entitlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsHosted = true;
    mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: {} });
  });

  it("returns 400 in self-hosted mode", async () => {
    mockIsHosted = false;
    const res = (await GET())!;
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockResolvedValue({
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = (await GET())!;
    expect(res.status).toBe(401);
  });

  it("upserts free entitlement for new users", async () => {
    setupChain({
      plan: "free",
      free_generations_used: 0,
      daily_generations_used: 0,
      last_generation_date: "2025-01-01",
    });
    const res = (await GET())!;
    const body = await res.json();
    expect(body.plan).toBe("free");
    expect(body.canGenerate).toBe(true);
    expect(mockAdminUpsert).toHaveBeenCalled();
  });

  it("returns correct free limits", async () => {
    setupChain({
      plan: "free",
      free_generations_used: 2,
      daily_generations_used: 0,
      last_generation_date: "2025-01-01",
    });
    const res = (await GET())!;
    const body = await res.json();
    expect(body.plan).toBe("free");
    expect(body.used).toBe(2);
    expect(body.limit).toBe(3);
    expect(body.remaining).toBe(1);
    expect(body.canGenerate).toBe(true);
  });

  it("returns correct paid limits", async () => {
    setupChain({
      plan: "paid",
      free_generations_used: 3,
      daily_generations_used: 1,
      last_generation_date: new Date().toISOString().split("T")[0],
    });
    const res = (await GET())!;
    const body = await res.json();
    expect(body.plan).toBe("paid");
    expect(body.limit).toBe(3);
  });

  it("resets daily count for paid users on new day", async () => {
    // Upsert fails (row exists), fallback fetch returns yesterday's date
    const chain = {
      upsert: mockAdminUpsert.mockReturnThis(),
      select: mockAdminSelect.mockReturnThis(),
      single: mockAdminSingle.mockResolvedValue({
        data: null,
        error: { message: "duplicate" },
      }),
      eq: mockAdminEq.mockReturnThis(),
    };
    mockAdminFrom.mockReturnValue(chain);

    // Fallback fetch
    chain.single = vi.fn().mockResolvedValue({
      data: {
        plan: "paid",
        free_generations_used: 3,
        daily_generations_used: 3,
        last_generation_date: "2020-01-01", // old date
      },
      error: null,
    });
    // Re-mock from to return the fallback chain for the second call
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          upsert: mockAdminUpsert.mockReturnValue({
            select: mockAdminSelect.mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: "dup" } }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                plan: "paid",
                free_generations_used: 3,
                daily_generations_used: 3,
                last_generation_date: "2020-01-01",
              },
              error: null,
            }),
          }),
        }),
      };
    });

    const res = (await GET())!;
    const body = await res.json();
    expect(body.used).toBe(0); // Reset because it's a new day
    expect(body.canGenerate).toBe(true);
  });

  it("returns 500 on fetch error", async () => {
    // Upsert fails, and fallback also fails
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: "dup" } }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }),
          }),
        }),
      };
    });

    const res = (await GET())!;
    expect(res.status).toBe(500);
  });
});
