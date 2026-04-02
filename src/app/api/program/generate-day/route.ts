import { streamObject } from "ai";
import { getAIClient, DEFAULT_MODEL } from "@/lib/ai/client";
import { buildProgramDaySystemPrompt, buildProgramDayUserPrompt } from "@/lib/ai/prompts-program";
import { generateProgramDaySchema } from "@/lib/ai/schemas-program";
import { workoutOutputSchema } from "@/lib/ai/schemas";
import { config } from "@/lib/config";
import { requireAuth } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Profile } from "@/types/profile";
import { Equipment, SharedResourceGroup } from "@/types/gym";
import { ProgramOutline } from "@/types/program";

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
    const parsed = generateProgramDaySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { program_outline, week_number, day_number, bodyweight } = parsed.data;

    const apiKey = config.anthropic.apiKey;

    if (!apiKey) {
      return Response.json(
        { error: "No API key configured. Set the ANTHROPIC_API_KEY environment variable." },
        { status: 401 }
      );
    }

    const outline: ProgramOutline = program_outline;
    const week = outline.weeks.find((w) => w.week_number === week_number);
    const day = week?.days.find((d) => d.day_number === day_number);

    if (!week || !day) {
      return Response.json(
        { error: `Day ${day_number} of week ${week_number} not found in program outline` },
        { status: 400 }
      );
    }

    const profile: Profile = body.profile_data || {
      id: null,
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
      system: buildProgramDaySystemPrompt(bodyweight),
      prompt: buildProgramDayUserPrompt({
        profile,
        equipment,
        sharedResources,
        layoutNotes,
        outline,
        weekNumber: week_number,
        dayNumber: day_number,
        day,
        bodyweight,
      }),
      schema: workoutOutputSchema,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Program day generation error:", error);
    return Response.json(
      { error: "Failed to generate day workout" },
      { status: 500 }
    );
  }
}
