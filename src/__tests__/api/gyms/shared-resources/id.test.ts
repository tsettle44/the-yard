import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUser = { id: "user-123" };
const mockFrom = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

import { DELETE } from "@/app/api/gyms/[id]/shared-resources/[resourceId]/route";

const params = Promise.resolve({ id: "gym-1", resourceId: "sr-1" });

describe("DELETE /api/gyms/:id/shared-resources/:resourceId", () => {
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

  it("returns 404 when gym not owned", async () => {
    const chain: Record<string, any> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(404);
  });

  it("deletes the shared resource", async () => {
    const gymChain: Record<string, any> = {};
    gymChain.select = vi.fn().mockReturnValue(gymChain);
    gymChain.eq = vi.fn().mockReturnValue(gymChain);
    gymChain.single = vi.fn().mockResolvedValue({ data: { id: "gym-1" }, error: null });

    const srChain: Record<string, any> = {};
    srChain.delete = vi.fn().mockReturnValue(srChain);
    srChain.eq = vi.fn().mockReturnValue(srChain);
    let eqCount = 0;
    srChain.eq.mockImplementation(() => {
      eqCount++;
      if (eqCount >= 2) return Promise.resolve({ error: null });
      return srChain;
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "gyms") return gymChain;
      return srChain;
    });

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(204);
  });

  it("returns 500 on DB error", async () => {
    const gymChain: Record<string, any> = {};
    gymChain.select = vi.fn().mockReturnValue(gymChain);
    gymChain.eq = vi.fn().mockReturnValue(gymChain);
    gymChain.single = vi.fn().mockResolvedValue({ data: { id: "gym-1" }, error: null });

    const srChain: Record<string, any> = {};
    srChain.delete = vi.fn().mockReturnValue(srChain);
    srChain.eq = vi.fn().mockReturnValue(srChain);
    let eqCount = 0;
    srChain.eq.mockImplementation(() => {
      eqCount++;
      if (eqCount >= 2) return Promise.resolve({ error: { message: "fail" } });
      return srChain;
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "gyms") return gymChain;
      return srChain;
    });

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(500);
  });
});
