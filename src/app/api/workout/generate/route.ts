import { generateObject, streamObject } from "ai";
import { getAIClient, DEFAULT_MODEL } from "@/lib/ai/client";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import { generateWorkoutSchema, workoutOutputSchema } from "@/lib/ai/schemas";
import { config } from "@/lib/config";
import { requireAuth } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Profile } from "@/types/profile";
import { Equipment, SharedResourceGroup } from "@/types/gym";
import { validateGroupSchedule } from "@/lib/workout/validate-group-schedule";

export const maxDuration = 60;

async function loadHostedGymResources(gymId: string, userId: string) {
  const supabase = createAdminClient();
  const { data: gym, error: gymError } = await supabase
    .from("gyms")
    .select("id")
    .eq("id", gymId)
    .eq("user_id", userId)
    .single();

  if (gymError || !gym) return null;

  const [equipmentResult, sharedResourcesResult] = await Promise.all([
    supabase.from("equipment").select("*").eq("gym_id", gymId),
    supabase.from("shared_resource_groups").select("*").eq("gym_id", gymId),
  ]);

  if (equipmentResult.error || sharedResourcesResult.error) return null;

  return {
    equipment: (equipmentResult.data || []) as Equipment[],
    sharedResources: (sharedResourcesResult.data || []).map((resource) => ({
      id: resource.id,
      gym_id: resource.gym_id,
      resource_name: resource.resource_name,
      equipment_ids: resource.equipment_ids,
      constraint: resource.constraint_type,
      notes: resource.notes,
    })) as SharedResourceGroup[],
    layoutNotes: "",
  };
}

export async function POST(request: Request) {
  try {
    let hostedUserId: string | null = null;
    // Hosted mode: enforce auth + generation limits
    if (config.isHosted) {
      const auth = await requireAuth();
      if ("error" in auth) return auth.error;
      hostedUserId = auth.user.id;

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

    const { profile_id, style, duration_min, target_rpe, body_groups, parameters, bodyweight, participant_count, group_format } =
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

    let equipment: Equipment[] = bodyweight ? [] : (body.equipment_data || []);
    let sharedResources: SharedResourceGroup[] = bodyweight ? [] : (body.shared_resources_data || []);
    let layoutNotes: string = bodyweight ? "" : (body.layout_notes || "");

    if (config.isHosted && participant_count > 1 && !bodyweight) {
      if (!parsed.data.gym_id || !hostedUserId) {
        return Response.json({ error: "A valid gym is required for hosted group workouts." }, { status: 400 });
      }
      const hostedResources = await loadHostedGymResources(parsed.data.gym_id, hostedUserId);
      if (!hostedResources) {
        return Response.json({ error: "Unable to load the selected gym's equipment." }, { status: 404 });
      }
      equipment = hostedResources.equipment;
      sharedResources = hostedResources.sharedResources;
      layoutNotes = body.layout_notes || hostedResources.layoutNotes;
    }

    const anthropic = getAIClient(apiKey);
    const generationOptions = {
      model: anthropic(DEFAULT_MODEL),
      system: buildSystemPrompt(bodyweight),
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
        bodyweight,
        participantCount: participant_count,
        groupFormat: group_format,
      }),
      schema: workoutOutputSchema,
    };

    if (participant_count > 1 && group_format) {
      const result = await generateObject(generationOptions);
      const validation = validateGroupSchedule({
        schedule: result.object.group,
        participantCount: participant_count,
        format: group_format,
        equipment,
        sharedResources,
        bodyweight,
      });

      if (!validation.valid) {
        console.error("Invalid group workout schedule:", validation.errors);
        return Response.json(
          { error: "The generated group schedule conflicted with the available equipment. Please try again." },
          { status: 422 }
        );
      }

      return Response.json(result.object);
    }

    const result = streamObject(generationOptions);

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Workout generation error:", error);
    return Response.json(
      { error: "Failed to generate workout" },
      { status: 500 }
    );
  }
}
