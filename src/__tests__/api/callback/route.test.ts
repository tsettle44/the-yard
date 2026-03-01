import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExchangeCode } = vi.hoisted(() => ({
  mockExchangeCode: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: mockExchangeCode,
    },
  }),
}));

import { GET } from "@/app/(auth)/callback/route";

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost:3000/callback");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

describe("GET /callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExchangeCode.mockResolvedValue({ error: null });
  });

  it("exchanges code for session", async () => {
    const req = makeRequest({ code: "auth-code-123" });
    await GET(req);
    expect(mockExchangeCode).toHaveBeenCalledWith("auth-code-123");
  });

  it("redirects to next param on success", async () => {
    const req = makeRequest({ code: "auth-code-123", next: "/generate" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/generate");
  });

  it("defaults to / when no next param", async () => {
    const req = makeRequest({ code: "auth-code-123" });
    const res = await GET(req);
    expect(res.headers.get("location")).toContain("/");
  });

  it("redirects to /login on failure", async () => {
    mockExchangeCode.mockResolvedValue({ error: { message: "invalid" } });
    const req = makeRequest({ code: "bad-code" });
    const res = await GET(req);
    expect(res.headers.get("location")).toContain("/login?error=auth_failed");
  });

  it("redirects to /login when no code", async () => {
    const req = makeRequest({});
    const res = await GET(req);
    expect(res.headers.get("location")).toContain("/login?error=auth_failed");
  });
});
