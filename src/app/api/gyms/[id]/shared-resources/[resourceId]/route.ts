import { requireAuth } from "@/lib/api/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { id: gymId, resourceId } = await params;

  // Verify gym ownership
  const { data: gym } = await supabase
    .from("gyms")
    .select("id")
    .eq("id", gymId)
    .eq("user_id", user.id)
    .single();

  if (!gym) return Response.json({ error: "Gym not found" }, { status: 404 });

  const { error } = await supabase
    .from("shared_resource_groups")
    .delete()
    .eq("id", resourceId)
    .eq("gym_id", gymId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
