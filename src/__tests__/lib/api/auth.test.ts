import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
  };
  return { mockSupabase };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

import { getAuthUser, requireAuth } from "@/lib/api/auth";

describe("getAuthUser()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user on valid session", async () => {
    const user = { id: "user-1", email: "test@test.com" };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    const result = await getAuthUser();
    expect(result).toEqual(user);
  });

  it("returns null on error", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid" },
    });
    const result = await getAuthUser();
    expect(result).toBeNull();
  });

  it("returns null when no user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const result = await getAuthUser();
    expect(result).toBeNull();
  });
});

describe("requireAuth()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user and supabase on success", async () => {
    const user = { id: "user-1" };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    const result = await requireAuth();
    expect(result).toHaveProperty("user", user);
    expect(result).toHaveProperty("supabase");
  });

  it("returns error 401 on failure", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const result = await requireAuth();
    expect(result).toHaveProperty("error");
    const errorResponse = (result as { error: Response }).error;
    expect(errorResponse.status).toBe(401);
  });
});
