import { streamObject } from "ai";
import { getAIClient, DEFAULT_MODEL } from "@/lib/ai/client";
import { buildTrainingPlanSystemPrompt, buildTrainingPlanUserPrompt } from "@/lib/ai/training-plan-prompts";
import { generateTrainingPlanSchema, trainingPlanOutputSchema } from "@/lib/ai/training-plan-schemas";
import { config } from "@/lib/config";
import { requireAuth } from "@/lib/api/auth";
import { Equipment } from "@/types/gym";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    if (config.isHosted) {
      const auth = await requireAuth();
      if ("error" in auth) return auth.error;
    }

    const body = await request.json();
    const parsed = generateTrainingPlanSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const apiKey = config.anthropic.apiKey;

    if (!apiKey) {
      return Response.json(
        { error: "No API key configured. Set the ANTHROPIC_API_KEY environment variable." },
        { status: 401 }
      );
    }

    const equipment: Equipment[] = body.equipment_data || [];

    const anthropic = getAIClient(apiKey);
    const result = streamObject({
      model: anthropic(DEFAULT_MODEL),
      system: buildTrainingPlanSystemPrompt(),
      prompt: buildTrainingPlanUserPrompt({ request: parsed.data, equipment }),
      schema: trainingPlanOutputSchema,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Training plan generation error:", error);
    return Response.json(
      { error: "Failed to generate training plan" },
      { status: 500 }
    );
  }
}
