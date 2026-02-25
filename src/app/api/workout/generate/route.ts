import { streamText } from "ai";
import { getAIClient, DEFAULT_MODEL } from "@/lib/ai/client";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import { generateWorkoutSchema } from "@/lib/ai/schemas";
import { config } from "@/lib/config";
import { Profile } from "@/types/profile";
import { Equipment, EquipmentConflict } from "@/types/gym";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = generateWorkoutSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { profile_id, gym_id, style, duration_min, target_rpe, body_groups, parameters } =
      parsed.data;

    // Get API key — from header (self-hosted) or env (hosted)
    let apiKey = config.anthropic.apiKey;
    const headerKey = request.headers.get("X-API-Key");
    if (headerKey) {
      apiKey = headerKey;
    }

    if (!apiKey) {
      return Response.json(
        { error: "No API key configured. Set ANTHROPIC_API_KEY or provide via settings." },
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
    const conflicts: EquipmentConflict[] = body.conflicts_data || [];

    const anthropic = getAIClient(apiKey);
    const result = streamText({
      model: anthropic(DEFAULT_MODEL),
      system: buildSystemPrompt(),
      prompt: buildUserPrompt({
        profile,
        equipment,
        conflicts,
        style,
        durationMin: duration_min,
        targetRpe: target_rpe,
        bodyGroups: body_groups,
        parameters: parameters || {},
      }),
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
