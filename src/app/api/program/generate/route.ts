import { streamObject } from "ai";
import { getAIClient, DEFAULT_MODEL } from "@/lib/ai/client";
import { buildProgramSystemPrompt, buildProgramUserPrompt } from "@/lib/ai/prompts-program";
import { generateProgramSchema, programOutlineOutputSchema } from "@/lib/ai/schemas-program";
import { config } from "@/lib/config";
import { requireAuth } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Profile } from "@/types/profile";
import { Equipment, SharedResourceGroup } from "@/types/gym";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
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
              ? "You've used all 3 free generations. Upgrade to keep generating."
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
    const parsed = generateProgramSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { template, total_weeks, days_per_week, target_rpe, body_groups, parameters, bodyweight } =
      parsed.data;

    const apiKey = config.anthropic.apiKey;

    if (!apiKey) {
      return Response.json(
        { error: "No API key configured. Set the ANTHROPIC_API_KEY environment variable." },
        { status: 401 }
      );
    }

    const profile: Profile = body.profile_data || {
      id: parsed.data.profile_id,
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

    const equipment: Equipment[] = bodyweight ? [] : (body.equipment_data || []);
    const sharedResources: SharedResourceGroup[] = bodyweight ? [] : (body.shared_resources_data || []);
    const layoutNotes: string = bodyweight ? "" : (body.layout_notes || "");

    const anthropic = getAIClient(apiKey);
    const result = streamObject({
      model: anthropic(DEFAULT_MODEL),
      system: buildProgramSystemPrompt(bodyweight),
      prompt: buildProgramUserPrompt({
        profile,
        equipment,
        sharedResources,
        layoutNotes,
        template,
        totalWeeks: total_weeks,
        daysPerWeek: days_per_week,
        targetRpe: target_rpe,
        bodyGroups: body_groups,
        parameters: parameters || {},
        bodyweight,
      }),
      schema: programOutlineOutputSchema,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Program generation error:", error);
    return Response.json(
      { error: "Failed to generate program" },
      { status: 500 }
    );
  }
}
