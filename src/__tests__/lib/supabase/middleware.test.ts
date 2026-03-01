import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock config
let mockIsSelfHosted = false;
vi.mock("@/lib/config", () => ({
  config: {
    get isSelfHosted() { return mockIsSelfHosted; },
    get isHosted() { return !mockIsSelfHosted; },
  },
}));

// Mock supabase server client
const mockGetUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

import { updateSession } from "@/lib/supabase/middleware";

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${pathname}`));
}

describe("updateSession middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSelfHosted = false;
  });

  describe("self-hosted mode", () => {
    it("skips all auth and returns next()", async () => {
      mockIsSelfHosted = true;
      const req = makeRequest("/generate");
      const res = await updateSession(req);
      expect(res.status).toBe(200);
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });

  describe("hosted mode", () => {
    it("allows auth routes unauthenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const req = makeRequest("/login");
      const res = await updateSession(req);
      expect(res.status).toBe(200);
    });

    it("redirects unauthenticated users from app routes to /login", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const req = makeRequest("/generate");
      const res = await updateSession(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    it("redirects authenticated users from login to /", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
      const req = makeRequest("/login");
      const res = await updateSession(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/");
    });

    it("allows public route /api/health unauthenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const req = makeRequest("/api/health");
      const res = await updateSession(req);
      expect(res.status).toBe(200);
    });

    it("allows public route /api/payment/webhook unauthenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const req = makeRequest("/api/payment/webhook");
      const res = await updateSession(req);
      expect(res.status).toBe(200);
    });
  });
});
