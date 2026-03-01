import { vi } from "vitest";

export function createMockStripe() {
  return {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          url: "https://checkout.stripe.com/test-session",
          id: "cs_test_123",
        }),
      },
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { user_id: "user-123" },
            payment_intent: "pi_test_123",
            amount_total: 999,
          },
        },
      }),
    },
  };
}
