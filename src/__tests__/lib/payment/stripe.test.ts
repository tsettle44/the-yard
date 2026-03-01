import { describe, it, expect, vi, beforeEach } from "vitest";

const { MockStripe } = vi.hoisted(() => {
  class MockStripe {
    key: string;
    constructor(key: string) {
      this.key = key;
    }
  }
  return { MockStripe: MockStripe as unknown as typeof import("stripe").default };
});

vi.mock("stripe", () => ({ default: MockStripe }));

describe("getStripe()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates Stripe with configured key", async () => {
    vi.doMock("@/lib/config", () => ({
      config: { stripe: { secretKey: "sk_test_123" } },
    }));
    const { getStripe } = await import("@/lib/payment/stripe");
    const stripe = getStripe() as unknown as { key: string };
    expect(stripe.key).toBe("sk_test_123");
  });

  it("throws when key is missing", async () => {
    vi.doMock("@/lib/config", () => ({
      config: { stripe: { secretKey: "" } },
    }));
    const { getStripe } = await import("@/lib/payment/stripe");
    expect(() => getStripe()).toThrow("STRIPE_SECRET_KEY is not configured");
  });
});
