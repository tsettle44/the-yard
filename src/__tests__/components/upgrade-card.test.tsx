import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UpgradeCard } from "@/components/payment/upgrade-card";

describe("UpgradeCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("renders pricing info", () => {
    render(<UpgradeCard />);
    expect(screen.getByText("Unlock The Yard")).toBeInTheDocument();
    expect(screen.getByText("Upgrade for $9.99")).toBeInTheDocument();
    expect(screen.getByText(/One-time purchase/)).toBeInTheDocument();
    expect(screen.getByText(/3 workouts per day/)).toBeInTheDocument();
  });

  it("renders free generation message", () => {
    render(<UpgradeCard />);
    expect(screen.getByText(/free generations/)).toBeInTheDocument();
  });

  it("calls checkout API on click", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ url: "https://checkout.stripe.com/test" }))
    );
    render(<UpgradeCard />);
    fireEvent.click(screen.getByText("Upgrade for $9.99"));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/payment/create-checkout", { method: "POST" });
    });
    fetchSpy.mockRestore();
  });

  it("redirects to checkout URL", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ url: "https://checkout.stripe.com/test" }))
    );
    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, href: "" },
    });
    render(<UpgradeCard />);
    fireEvent.click(screen.getByText("Upgrade for $9.99"));
    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.com/test");
    });
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  it("shows loading state", async () => {
    let resolvePromise: (value: Response) => void;
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve; })
    );
    render(<UpgradeCard />);
    fireEvent.click(screen.getByText("Upgrade for $9.99"));
    // Button should be disabled while loading
    await waitFor(() => {
      expect(screen.getByText("Upgrade for $9.99").closest("button")).toBeDisabled();
    });
    // Resolve to clean up
    resolvePromise!(new Response(JSON.stringify({ url: "https://test.com" })));
  });

  it("handles error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    render(<UpgradeCard />);
    fireEvent.click(screen.getByText("Upgrade for $9.99"));
    await waitFor(() => {
      expect(screen.getByText("Upgrade for $9.99").closest("button")).not.toBeDisabled();
    });
    consoleSpy.mockRestore();
  });

  it("handles missing URL in response", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ url: null }))
    );
    render(<UpgradeCard />);
    fireEvent.click(screen.getByText("Upgrade for $9.99"));
    await waitFor(() => {
      expect(screen.getByText("Upgrade for $9.99").closest("button")).not.toBeDisabled();
    });
    consoleSpy.mockRestore();
  });
});
