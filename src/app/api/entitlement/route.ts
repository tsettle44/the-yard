import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { requireAuth } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  if (!config.isHosted) {
    return NextResponse.json({ error: "Not available in self-hosted mode" }, { status: 400 });
  }

  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { user } = auth;
  const supabase = createAdminClient();

  const { searchParams } = new URL(request.url);
  const timezone = searchParams.get("timezone") || "UTC";

  // Get today in the user's timezone
  const today = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

  // Upsert a free row if none exists
  const { data, error } = await supabase
    .from("entitlements")
    .upsert(
      {
        user_id: user.id,
        plan: "free",
        free_generations_used: 0,
        daily_generations_used: 0,
        last_generation_date: today,
      },
      { onConflict: "user_id", ignoreDuplicates: true }
    )
    .select()
    .single();

  if (error) {
    // Row already exists — just fetch it
    const { data: existing, error: fetchError } = await supabase
      .from("entitlements")
      .select()
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Failed to fetch entitlement" }, { status: 500 });
    }

    const row = existing;
    const plan = row.plan as "free" | "paid";
    const limit = plan === "free" ? config.freeGenerations : config.dailyGenerationLimit;
    const used = plan === "free" ? row.free_generations_used : row.daily_generations_used;

    // Reset daily count if new day in user's timezone
    const effectiveUsed = plan === "paid" && row.last_generation_date !== today ? 0 : used;

    return NextResponse.json({
      plan,
      used: effectiveUsed,
      limit,
      remaining: Math.max(limit - effectiveUsed, 0),
      canGenerate: effectiveUsed < limit,
    });
  }

  const plan = data.plan as "free" | "paid";
  const limit = plan === "free" ? config.freeGenerations : config.dailyGenerationLimit;
  const used = plan === "free" ? data.free_generations_used : data.daily_generations_used;

  return NextResponse.json({
    plan,
    used,
    limit,
    remaining: Math.max(limit - used, 0),
    canGenerate: used < limit,
  });
}
