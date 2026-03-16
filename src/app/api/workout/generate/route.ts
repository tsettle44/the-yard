import { streamObject } from "ai";
import { getAIClient, DEFAULT_MODEL } from "@/lib/ai/client";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import { generateWorkoutSchema, workoutOutputSchema } from "@/lib/ai/schemas";
import { config } from "@/lib/config";
import { requireAuth } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Profile } from "@/types/profile";
import { Equipment, SharedResourceGroup } from "@/types/gym";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // Hosted mode: enforce auth + generation limits
    if (config.isHosted) {
      const auth = await requireAuth();
      if ("error" in auth) return auth.error;

      const body = await request.clone().json();
      const supabase = createAdminClient();
      const { data: result, error: rpcError } = await supabase.rpc(
        "check_and_increment_generation",
        { p_user_id: auth.user.id, p_timezone: body.timezone || "UTC" }
      );

      if (rpcError) {
        console.error("Entitlement check error:", rpcError);
        return Response.json(
          { error: "Failed to check generation limit" },
          { status: 500 }
        );
      }

      if (!result.allowed) {
        return Response.json(
          {
            error: result.plan === "free"
              ? "You've used all 3 free generations. Upgrade to keep generating workouts."
              : "Daily generation limit reached. Come back tomorrow!",
            plan: result.plan,
            used: result.used,
            limit: result.limit,
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const parsed = generateWorkoutSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { profile_id, style, duration_min, target_rpe, body_groups, parameters } =
      parsed.data;

    const apiKey = config.anthropic.apiKey;

    if (!apiKey) {
      return Response.json(
        { error: "No API key configured. Set the ANTHROPIC_API_KEY environment variable." },
        { status: 401 }
      );
    }

    // In self-hosted mode, profile and gym data comes from the client-side localStorage.
    // We expect them to be passed in the request body.
    const profile: Profile = body.profile_data || {
      id: profile_id,
      user_id: null,
      name: "User",
      fitness_level: "intermediate",
      preferred_styles: [],
      goals: "",
      preferences: {},
      is_default: true,
      created_at: "",
      updated_at: "",
    };

    const equipment: Equipment[] = body.equipment_data || [];
    const sharedResources: SharedResourceGroup[] = body.shared_resources_data || [];
    const layoutNotes: string = body.layout_notes || "";

    const anthropic = getAIClient(apiKey);
    const result = streamObject({
      model: anthropic(DEFAULT_MODEL),
      system: buildSystemPrompt(),
      prompt: buildUserPrompt({
        profile,
        equipment,
        sharedResources,
        layoutNotes,
        style,
        durationMin: duration_min,
        targetRpe: target_rpe,
        bodyGroups: body_groups,
        parameters: parameters || {},
      }),
      schema: workoutOutputSchema,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Workout generation error:", error);
    return Response.json(
      { error: "Failed to generate workout" },
      { status: 500 }
    );
  }
}
