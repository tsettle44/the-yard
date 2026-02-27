import { requireAuth } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  // Fetch gyms with nested equipment and shared resources
  const { data: gyms, error: gymsError } = await supabase
    .from("gyms")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (gymsError) return Response.json({ error: gymsError.message }, { status: 500 });

  // Fetch equipment and shared resources for all gyms
  const gymIds = gyms.map((g: { id: string }) => g.id);

  if (gymIds.length === 0) return Response.json([]);

  const [equipmentResult, sharedResourcesResult] = await Promise.all([
    supabase
      .from("equipment")
      .select("*")
      .in("gym_id", gymIds),
    supabase
      .from("shared_resource_groups")
      .select("*")
      .in("gym_id", gymIds),
  ]);

  const equipmentByGym = new Map<string, unknown[]>();
  for (const eq of equipmentResult.data || []) {
    const list = equipmentByGym.get(eq.gym_id) || [];
    list.push(eq);
    equipmentByGym.set(eq.gym_id, list);
  }

  const resourcesByGym = new Map<string, unknown[]>();
  for (const sr of sharedResourcesResult.data || []) {
    const list = resourcesByGym.get(sr.gym_id) || [];
    list.push({
      id: sr.id,
      gym_id: sr.gym_id,
      resource_name: sr.resource_name,
      equipment_ids: sr.equipment_ids,
      constraint: sr.constraint_type,
      notes: sr.notes,
    });
    resourcesByGym.set(sr.gym_id, list);
  }

  const result = gyms.map((gym: { id: string }) => ({
    ...gym,
    equipment: equipmentByGym.get(gym.id) || [],
    shared_resources: resourcesByGym.get(gym.id) || [],
  }));

  return Response.json(result);
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await request.json();

  const { data, error } = await supabase
    .from("gyms")
    .insert({
      user_id: user.id,
      name: body.name,
      layout_notes: body.layout_notes || "",
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(
    { ...data, equipment: [], shared_resources: [] },
    { status: 201 }
  );
}
