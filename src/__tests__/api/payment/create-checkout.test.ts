import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSessionCreate, mockGetUser } = vi.hoisted(() => ({
  mockSessionCreate: vi.fn(),
  mockGetUser: vi.fn(),
}));

let mockIsHosted = true;
let mockPaymentEnabled = true;
vi.mock("@/lib/config", () => ({
  config: {
    get isHosted() { return mockIsHosted; },
    get isSelfHosted() { return !mockIsHosted; },
    features: { get payment() { return mockPaymentEnabled; } },
    stripe: { priceId: "price_test_123" },
    app: { url: "http://localhost:3000" },
  },
}));

vi.mock("@/lib/payment/stripe", () => ({
  getStripe: () => ({
    checkout: {
      sessions: { create: mockSessionCreate },
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

import { POST } from "@/app/api/payment/create-checkout/route";

describe("POST /api/payment/create-checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsHosted = true;
    mockPaymentEnabled = true;
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockSessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/sess" });
  });

  it("returns 400 when not hosted", async () => {
    mockIsHosted = false;
    const res = await POST();
    expect(res.status).toBe(400);
  });

  it("returns 400 when payment disabled", async () => {
    mockPaymentEnabled = false;
    const res = await POST();
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("passes correct params to Stripe", async () => {
    await POST();
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{ price: "price_test_123", quantity: 1 }],
        client_reference_id: "user-123",
      })
    );
  });

  it("includes success and cancel URLs", async () => {
    await POST();
    const call = mockSessionCreate.mock.calls[0][0];
    expect(call.success_url).toContain("/generate?payment=success");
    expect(call.cancel_url).toContain("/generate?payment=cancelled");
  });

  it("returns checkout URL", async () => {
    const res = await POST();
    const body = await res.json();
    expect(body.url).toBe("https://checkout.stripe.com/sess");
  });

  it("returns 500 on Stripe error", async () => {
    mockSessionCreate.mockRejectedValue(new Error("Stripe down"));
    const res = await POST();
    expect(res.status).toBe(500);
  });
});
