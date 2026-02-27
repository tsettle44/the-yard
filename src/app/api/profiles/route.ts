import { requireAuth } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await request.json();

  // If setting as default, unset others first
  if (body.is_default) {
    await supabase
      .from("profiles")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      name: body.name,
      fitness_level: body.fitness_level,
      preferred_styles: body.preferred_styles || [],
      goals: body.goals || "",
      preferences: body.preferences || {},
      is_default: body.is_default || false,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
