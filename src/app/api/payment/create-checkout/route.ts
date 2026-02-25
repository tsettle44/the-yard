import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getStripe } from "@/lib/payment/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  if (!config.isHosted || !config.features.payment) {
    return NextResponse.json({ error: "Payments not enabled" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: config.stripe.priceId,
          quantity: 1,
        },
      ],
      success_url: `${config.app.url}/generate?payment=success`,
      cancel_url: `${config.app.url}/generate?payment=cancelled`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
