import { createClient } from "@/lib/supabase/server";

/**
 * Get the authenticated user from Supabase session.
 * Returns the user or null if not authenticated.
 */
export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Require authentication. Returns { user, supabase } or a 401 Response.
 */
export async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, supabase };
}
