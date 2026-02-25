import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getStripe } from "@/lib/payment/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!config.isHosted || !config.features.payment) {
    return NextResponse.json({ error: "Payments not enabled" }, { status: 400 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripe.webhookSecret
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.user_id;

      if (!userId) {
        console.error("No user_id in session metadata");
        return NextResponse.json({ error: "Invalid session" }, { status: 400 });
      }

      const supabase = createAdminClient();

      // Record payment
      await supabase.from("payments").insert({
        user_id: userId,
        stripe_payment_id: session.payment_intent as string,
        amount: session.amount_total || 500,
        status: "completed",
      });

      // Update entitlement
      await supabase
        .from("entitlements")
        .upsert(
          {
            user_id: userId,
            plan: "paid",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}
