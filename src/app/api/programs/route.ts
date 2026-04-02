import { requireAuth } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id);

  const profileIds = (profiles || []).map((p: { id: string }) => p.id);

  if (profileIds.length === 0) {
    return Response.json([]);
  }

  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .in("profile_id", profileIds)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const body = await request.json();

  const { data, error } = await supabase
    .from("programs")
    .insert({
      profile_id: body.profile_id || null,
      gym_id: body.gym_id,
      template: body.template,
      name: body.name,
      total_weeks: body.total_weeks,
      days_per_week: body.days_per_week,
      outline: body.outline,
      current_week: body.current_week || 1,
      current_day: body.current_day || 1,
      status: body.status || "active",
      parameters: body.parameters || {},
      model_used: body.model_used || "",
      bodyweight: body.bodyweight || false,
      rating: body.rating || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
