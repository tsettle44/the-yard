import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function upgrade() {
  const userId = "53663b3a-a842-448a-99be-f236c8bc0974";

  const { error } = await supabase
    .from("entitlements")
    .update({
      plan: "paid",
      daily_generations_used: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.log("Error:", error);
  } else {
    console.log("User upgraded to paid plan.");
  }

  const { data } = await supabase
    .from("entitlements")
    .select("*")
    .eq("user_id", userId)
    .single();
  console.log("Updated entitlement:", JSON.stringify(data, null, 2));
}

upgrade();
