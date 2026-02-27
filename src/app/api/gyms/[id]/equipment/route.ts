import { requireAuth } from "@/lib/api/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { id: gymId } = await params;

  // Verify gym ownership
  const { data: gym } = await supabase
    .from("gyms")
    .select("id")
    .eq("id", gymId)
    .eq("user_id", user.id)
    .single();

  if (!gym) return Response.json({ error: "Gym not found" }, { status: 404 });

  const body = await request.json();

  const { data, error } = await supabase
    .from("equipment")
    .insert({
      gym_id: gymId,
      slug: body.slug,
      name: body.name,
      category: body.category,
      attributes: body.attributes || {},
      quantity: body.quantity || 1,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
