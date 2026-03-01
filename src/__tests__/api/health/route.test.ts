import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/config", () => ({
  config: {
    deploymentMode: "self-hosted",
  },
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns status ok", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("includes deployment mode", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.mode).toBe("self-hosted");
  });

  it("includes timestamp", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });
});
