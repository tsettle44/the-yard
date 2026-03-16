import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

let mockIsHosted = false;
vi.mock("@/lib/config", () => ({
  config: {
    get isHosted() { return mockIsHosted; },
  },
}));

import { useEntitlement } from "@/hooks/use-entitlement";

describe("useEntitlement — Self-hosted", () => {
  beforeEach(() => {
    mockIsHosted = false;
    vi.clearAllMocks();
  });

  it("returns null plan", () => {
    const { result } = renderHook(() => useEntitlement());
    expect(result.current.plan).toBeNull();
  });

  it("returns Infinity remaining", () => {
    const { result } = renderHook(() => useEntitlement());
    expect(result.current.remaining).toBe(Infinity);
  });

  it("does not make API call", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderHook(() => useEntitlement());
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("useEntitlement — Hosted", () => {
  beforeEach(() => {
    mockIsHosted = true;
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ plan: "free", used: 0, limit: 3, remaining: 3, canGenerate: true }))
    );
    const { result } = renderHook(() => useEntitlement());
    expect(result.current.loading).toBe(true);
  });

  it("fetches entitlement on mount", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ plan: "free", used: 1, limit: 3, remaining: 2, canGenerate: true }))
    );
    renderHook(() => useEntitlement());
    await waitFor(() => {
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toMatch(/^\/api\/entitlement\?timezone=/)
    });
    fetchSpy.mockRestore();
  });

  it("returns API data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ plan: "paid", used: 1, limit: 3, remaining: 2, canGenerate: true }))
    );
    const { result } = renderHook(() => useEntitlement());
    await waitFor(() => {
      expect(result.current.plan).toBe("paid");
      expect(result.current.remaining).toBe(2);
      expect(result.current.canGenerate).toBe(true);
    });
  });

  it("handles fetch error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useEntitlement());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.plan).toBeNull();
    consoleSpy.mockRestore();
  });
});
