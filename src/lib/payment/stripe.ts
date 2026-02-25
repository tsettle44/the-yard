import Stripe from "stripe";
import { config } from "@/lib/config";

export function getStripe() {
  if (!config.stripe.secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(config.stripe.secretKey);
}
