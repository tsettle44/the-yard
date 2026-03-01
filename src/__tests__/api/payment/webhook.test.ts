import { describe, it, expect, vi, beforeEach } from "vitest";

let mockIsHosted = true;
let mockPaymentEnabled = true;
vi.mock("@/lib/config", () => ({
  config: {
    get isHosted() { return mockIsHosted; },
    features: { get payment() { return mockPaymentEnabled; } },
    stripe: { webhookSecret: "whsec_test" },
  },
}));

const mockConstructEvent = vi.fn();
vi.mock("@/lib/payment/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mockConstructEvent },
  }),
}));

const mockInsert = vi.fn().mockReturnThis();
const mockUpsert = vi.fn().mockReturnThis();
const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
  }),
}));

import { POST } from "@/app/api/payment/webhook/route";

function makeRequest(body: string, signature?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "text/plain" };
  if (signature) headers["stripe-signature"] = signature;
  return new Request("http://localhost/api/payment/webhook", {
    method: "POST",
    headers,
    body,
  });
}

describe("POST /api/payment/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsHosted = true;
    mockPaymentEnabled = true;
    mockAdminFrom.mockReturnValue({ insert: mockInsert, upsert: mockUpsert });
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { user_id: "user-123" },
          payment_intent: "pi_test",
          amount_total: 999,
        },
      },
    });
  });

  it("returns 400 when not hosted", async () => {
    mockIsHosted = false;
    const res = await POST(makeRequest("body", "sig"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when missing signature", async () => {
    const res = await POST(makeRequest("body"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing signature");
  });

  it("returns 400 on invalid signature", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const res = await POST(makeRequest("body", "bad-sig"));
    expect(res.status).toBe(400);
  });

  it("handles checkout.session.completed event", async () => {
    const res = await POST(makeRequest("body", "valid-sig"));
    const body = await res.json();
    expect(body.received).toBe(true);
  });

  it("records payment", async () => {
    await POST(makeRequest("body", "valid-sig"));
    expect(mockAdminFrom).toHaveBeenCalledWith("payments");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        stripe_payment_id: "pi_test",
        amount: 999,
        status: "completed",
      })
    );
  });

  it("upserts entitlement to paid", async () => {
    await POST(makeRequest("body", "valid-sig"));
    expect(mockAdminFrom).toHaveBeenCalledWith("entitlements");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        plan: "paid",
        daily_generations_used: 0,
      }),
      { onConflict: "user_id" }
    );
  });

  it("returns 400 when user_id missing in metadata", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { metadata: {}, payment_intent: "pi_test", amount_total: 999 } },
    });
    const res = await POST(makeRequest("body", "sig"));
    expect(res.status).toBe(400);
  });

  it("ignores other event types", async () => {
    mockConstructEvent.mockReturnValue({
      type: "invoice.paid",
      data: { object: {} },
    });
    const res = await POST(makeRequest("body", "sig"));
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("uses raw body text for signature verification", async () => {
    await POST(makeRequest("raw-body-content", "sig"));
    expect(mockConstructEvent).toHaveBeenCalledWith(
      "raw-body-content",
      "sig",
      "whsec_test"
    );
  });
});
