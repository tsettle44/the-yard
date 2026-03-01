import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUser = { id: "user-123" };
const mockFrom = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

import { PATCH, DELETE } from "@/app/api/gyms/[id]/equipment/[equipmentId]/route";

const params = Promise.resolve({ id: "gym-1", equipmentId: "eq-1" });

function makeGymChain(found: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({
    data: found ? { id: "gym-1" } : null,
    error: null,
  });
  return chain;
}

describe("PATCH /api/gyms/:id/equipment/:equipmentId", () => {
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
      body: JSON.stringify({ quantity: 2 }),
    });
    const res = (await PATCH(req, { params }))!;
    expect(res.status).toBe(401);
  });

  it("returns 404 when gym not owned", async () => {
    mockFrom.mockReturnValue(makeGymChain(false));
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ quantity: 2 }),
    });
    const res = (await PATCH(req, { params }))!;
    expect(res.status).toBe(404);
  });

  it("updates quantity", async () => {
    const gymChain = makeGymChain(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eqChain: Record<string, any> = {};
    eqChain.update = vi.fn().mockReturnValue(eqChain);
    eqChain.eq = vi.fn().mockReturnValue(eqChain);
    eqChain.select = vi.fn().mockReturnValue(eqChain);
    eqChain.single = vi.fn().mockResolvedValue({ data: { id: "eq-1", quantity: 3 }, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "gyms") return gymChain;
      return eqChain;
    });

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ quantity: 3 }),
    });
    const res = (await PATCH(req, { params }))!;
    await res.json();
    expect(eqChain.update).toHaveBeenCalledWith(expect.objectContaining({ quantity: 3 }));
  });

  it("enforces minimum quantity of 1", async () => {
    const gymChain = makeGymChain(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eqChain: Record<string, any> = {};
    eqChain.update = vi.fn().mockReturnValue(eqChain);
    eqChain.eq = vi.fn().mockReturnValue(eqChain);
    eqChain.select = vi.fn().mockReturnValue(eqChain);
    eqChain.single = vi.fn().mockResolvedValue({ data: { id: "eq-1", quantity: 1 }, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "gyms") return gymChain;
      return eqChain;
    });

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ quantity: 0 }),
    });
    await PATCH(req, { params });
    expect(eqChain.update).toHaveBeenCalledWith(expect.objectContaining({ quantity: 1 }));
  });

  it("updates attributes", async () => {
    const gymChain = makeGymChain(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eqChain: Record<string, any> = {};
    eqChain.update = vi.fn().mockReturnValue(eqChain);
    eqChain.eq = vi.fn().mockReturnValue(eqChain);
    eqChain.select = vi.fn().mockReturnValue(eqChain);
    eqChain.single = vi.fn().mockResolvedValue({ data: { id: "eq-1" }, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "gyms") return gymChain;
      return eqChain;
    });

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ attributes: { adjustable: true } }),
    });
    await PATCH(req, { params });
    expect(eqChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ attributes: { adjustable: true } })
    );
  });
});

describe("DELETE /api/gyms/:id/equipment/:equipmentId", () => {
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

  it("returns 404 when gym not owned", async () => {
    mockFrom.mockReturnValue(makeGymChain(false));
    const req = new Request("http://localhost", { method: "DELETE" });
    const res = (await DELETE(req, { params }))!;
    expect(res.status).toBe(404);
  });

  it("deletes equipment and cascades to shared resources", async () => {
    const gymChain = makeGymChain(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eqDeleteChain: Record<string, any> = {};
    eqDeleteChain.delete = vi.fn().mockReturnValue(eqDeleteChain);
    eqDeleteChain.eq = vi.fn().mockReturnValue(eqDeleteChain);
    let eqDeleteEqCount = 0;
    eqDeleteChain.eq.mockImplementation(() => {
      eqDeleteEqCount++;
      if (eqDeleteEqCount >= 2) return Promise.resolve({ error: null });
      return eqDeleteChain;
    });

    // Shared resource groups query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const srSelectChain: Record<string, any> = {};
    srSelectChain.select = vi.fn().mockReturnValue(srSelectChain);
    srSelectChain.eq = vi.fn().mockResolvedValue({
      data: [
        { id: "sr-1", equipment_ids: ["eq-1", "eq-2", "eq-3"] },
        { id: "sr-2", equipment_ids: ["eq-1", "eq-4"] }, // will become < 2 items
      ],
      error: null,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const srDeleteChain: Record<string, any> = {};
    srDeleteChain.delete = vi.fn().mockReturnValue(srDeleteChain);
    srDeleteChain.eq = vi.fn().mockResolvedValue({ error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const srUpdateChain: Record<string, any> = {};
    srUpdateChain.update = vi.fn().mockReturnValue(srUpdateChain);
    srUpdateChain.eq = vi.fn().mockResolvedValue({ error: null });

    const fromCalls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      fromCalls.push(table);
      if (table === "gyms") return gymChain;
      if (table === "equipment") return eqDeleteChain;
      if (table === "shared_resource_groups") {
        // First call is select, subsequent calls are delete/update
        if (fromCalls.filter(t => t === "shared_resource_groups").length === 1) {
          return srSelectChain;
        }
        return { ...srDeleteChain, ...srUpdateChain };
      }
      return eqDeleteChain;
    });

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = (await DELETE(req, { params }))!;
    expect(res.status).toBe(204);
  });

  it("returns 500 on DB error", async () => {
    const gymChain = makeGymChain(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eqDeleteChain: Record<string, any> = {};
    eqDeleteChain.delete = vi.fn().mockReturnValue(eqDeleteChain);
    eqDeleteChain.eq = vi.fn().mockReturnValue(eqDeleteChain);
    let eqDeleteEqCount = 0;
    eqDeleteChain.eq.mockImplementation(() => {
      eqDeleteEqCount++;
      if (eqDeleteEqCount >= 2) return Promise.resolve({ error: { message: "fail" } });
      return eqDeleteChain;
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "gyms") return gymChain;
      return eqDeleteChain;
    });

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = (await DELETE(req, { params }))!;
    expect(res.status).toBe(500);
  });
});
