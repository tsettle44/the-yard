import { requireAuth } from "@/lib/api/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { id } = await params;

  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.rating !== undefined) updates.rating = body.rating;
  if (body.notes !== undefined) updates.notes = body.notes;

  const { data, error } = await supabase
    .from("workouts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { id } = await params;

  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
