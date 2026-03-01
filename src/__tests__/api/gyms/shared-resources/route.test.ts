import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUser = { id: "user-123" };
const mockFrom = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

import { POST } from "@/app/api/gyms/[id]/shared-resources/route";

const params = Promise.resolve({ id: "gym-1" });

describe("POST /api/gyms/:id/shared-resources", () => {
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
      body: JSON.stringify({ resource_name: "Test", equipment_ids: ["a", "b"], constraint: "no_superset" }),
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
      body: JSON.stringify({ resource_name: "Test", equipment_ids: ["a", "b"], constraint: "no_superset" }),
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(404);
  });

  it("maps constraint to constraint_type in insert", async () => {
    const gymChain: Record<string, any> = {};
    gymChain.select = vi.fn().mockReturnValue(gymChain);
    gymChain.eq = vi.fn().mockReturnValue(gymChain);
    gymChain.single = vi.fn().mockResolvedValue({ data: { id: "gym-1" }, error: null });

    const srChain: Record<string, any> = {};
    srChain.insert = vi.fn().mockReturnValue(srChain);
    srChain.select = vi.fn().mockReturnValue(srChain);
    srChain.single = vi.fn().mockResolvedValue({
      data: {
        id: "sr-1",
        gym_id: "gym-1",
        resource_name: "Station",
        equipment_ids: ["a", "b"],
        constraint_type: "group_together",
        notes: "",
      },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "gyms") return gymChain;
      return srChain;
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ resource_name: "Station", equipment_ids: ["a", "b"], constraint: "group_together" }),
    });
    await POST(req, { params });
    expect(srChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ constraint_type: "group_together" })
    );
  });

  it("maps response back to constraint field", async () => {
    const gymChain: Record<string, any> = {};
    gymChain.select = vi.fn().mockReturnValue(gymChain);
    gymChain.eq = vi.fn().mockReturnValue(gymChain);
    gymChain.single = vi.fn().mockResolvedValue({ data: { id: "gym-1" }, error: null });

    const srChain: Record<string, any> = {};
    srChain.insert = vi.fn().mockReturnValue(srChain);
    srChain.select = vi.fn().mockReturnValue(srChain);
    srChain.single = vi.fn().mockResolvedValue({
      data: {
        id: "sr-1",
        gym_id: "gym-1",
        resource_name: "Station",
        equipment_ids: ["a", "b"],
        constraint_type: "no_superset",
        notes: "",
      },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "gyms") return gymChain;
      return srChain;
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ resource_name: "Station", equipment_ids: ["a", "b"], constraint: "no_superset" }),
    });
    const res = await POST(req, { params });
    const body = await res.json();
    expect(body.constraint).toBe("no_superset");
    expect(body).not.toHaveProperty("constraint_type");
  });

  it("returns 201 on success", async () => {
    const gymChain: Record<string, any> = {};
    gymChain.select = vi.fn().mockReturnValue(gymChain);
    gymChain.eq = vi.fn().mockReturnValue(gymChain);
    gymChain.single = vi.fn().mockResolvedValue({ data: { id: "gym-1" }, error: null });

    const srChain: Record<string, any> = {};
    srChain.insert = vi.fn().mockReturnValue(srChain);
    srChain.select = vi.fn().mockReturnValue(srChain);
    srChain.single = vi.fn().mockResolvedValue({
      data: { id: "sr-1", gym_id: "gym-1", resource_name: "X", equipment_ids: [], constraint_type: "no_superset", notes: "" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "gyms") return gymChain;
      return srChain;
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ resource_name: "X", equipment_ids: ["a", "b"], constraint: "no_superset" }),
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(201);
  });

  it("returns 500 on DB error", async () => {
    const gymChain: Record<string, any> = {};
    gymChain.select = vi.fn().mockReturnValue(gymChain);
    gymChain.eq = vi.fn().mockReturnValue(gymChain);
    gymChain.single = vi.fn().mockResolvedValue({ data: { id: "gym-1" }, error: null });

    const srChain: Record<string, any> = {};
    srChain.insert = vi.fn().mockReturnValue(srChain);
    srChain.select = vi.fn().mockReturnValue(srChain);
    srChain.single = vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "gyms") return gymChain;
      return srChain;
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ resource_name: "X", equipment_ids: ["a", "b"], constraint: "no_superset" }),
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(500);
  });
});
