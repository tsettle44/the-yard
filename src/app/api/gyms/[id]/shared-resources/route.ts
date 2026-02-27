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
    .from("shared_resource_groups")
    .insert({
      gym_id: gymId,
      resource_name: body.resource_name,
      equipment_ids: body.equipment_ids,
      constraint_type: body.constraint,
      notes: body.notes || "",
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Map DB column name back to client field name
  return Response.json(
    {
      id: data.id,
      gym_id: data.gym_id,
      resource_name: data.resource_name,
      equipment_ids: data.equipment_ids,
      constraint: data.constraint_type,
      notes: data.notes,
    },
    { status: 201 }
  );
}
