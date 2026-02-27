import { requireAuth } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  // Get user's profiles to find their workouts
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id);

  const profileIds = (profiles || []).map((p: { id: string }) => p.id);

  // Also get workouts with null profile_id that belong to user's gyms
  const { data: gyms } = await supabase
    .from("gyms")
    .select("id")
    .eq("user_id", user.id);

  const gymIds = (gyms || []).map((g: { id: string }) => g.id);

  if (profileIds.length === 0 && gymIds.length === 0) {
    return Response.json([]);
  }

  // Fetch workouts belonging to user's profiles or user's gyms (guest mode)
  let query = supabase.from("workouts").select("*");

  if (profileIds.length > 0 && gymIds.length > 0) {
    query = query.or(`profile_id.in.(${profileIds.join(",")}),and(profile_id.is.null,gym_id.in.(${gymIds.join(",")}))`);
  } else if (profileIds.length > 0) {
    query = query.in("profile_id", profileIds);
  } else {
    query = query.is("profile_id", null).in("gym_id", gymIds);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const body = await request.json();

  const { data, error } = await supabase
    .from("workouts")
    .insert({
      profile_id: body.profile_id || null,
      gym_id: body.gym_id,
      style: body.style,
      duration_min: body.duration_min,
      target_rpe: body.target_rpe,
      body_groups: body.body_groups,
      parameters: body.parameters || {},
      content: body.content || "",
      structured: body.structured || null,
      model_used: body.model_used || "",
      prompt_tokens: body.prompt_tokens || 0,
      completion_tokens: body.completion_tokens || 0,
      rating: body.rating || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
