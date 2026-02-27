import { requireAuth } from "@/lib/api/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; equipmentId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { id: gymId, equipmentId } = await params;

  // Verify gym ownership
  const { data: gym } = await supabase
    .from("gyms")
    .select("id")
    .eq("id", gymId)
    .eq("user_id", user.id)
    .single();

  if (!gym) return Response.json({ error: "Gym not found" }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.quantity !== undefined) updates.quantity = Math.max(1, body.quantity);
  if (body.attributes !== undefined) updates.attributes = body.attributes;

  const { data, error } = await supabase
    .from("equipment")
    .update(updates)
    .eq("id", equipmentId)
    .eq("gym_id", gymId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; equipmentId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { id: gymId, equipmentId } = await params;

  // Verify gym ownership
  const { data: gym } = await supabase
    .from("gyms")
    .select("id")
    .eq("id", gymId)
    .eq("user_id", user.id)
    .single();

  if (!gym) return Response.json({ error: "Gym not found" }, { status: 404 });

  // Delete the equipment
  const { error } = await supabase
    .from("equipment")
    .delete()
    .eq("id", equipmentId)
    .eq("gym_id", gymId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Clean up shared resource groups that reference this equipment
  // Remove the equipment_id from arrays, then delete groups with < 2 items
  const { data: groups } = await supabase
    .from("shared_resource_groups")
    .select("id, equipment_ids")
    .eq("gym_id", gymId);

  if (groups) {
    for (const group of groups) {
      const filtered = (group.equipment_ids as string[]).filter((id: string) => id !== equipmentId);
      if (filtered.length < 2) {
        await supabase.from("shared_resource_groups").delete().eq("id", group.id);
      } else if (filtered.length !== (group.equipment_ids as string[]).length) {
        await supabase
          .from("shared_resource_groups")
          .update({ equipment_ids: filtered })
          .eq("id", group.id);
      }
    }
  }

  return new Response(null, { status: 204 });
}
