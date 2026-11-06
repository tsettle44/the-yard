import { generateObject } from "ai";
import { getAIClient, getModelId } from "@/lib/ai/client";
import { buildGroupSystemPrompt, buildGroupUserPrompt } from "@/lib/ai/prompts";
import { generateGroupWorkoutSchema, groupWorkoutOutputSchema } from "@/lib/ai/schemas";
import { validateGroupWorkout } from "@/lib/ai/group-validator";
import { config } from "@/lib/config";
import { requireAuth } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Profile } from "@/types/profile";
import { Equipment, SharedResourceGroup } from "@/types/gym";

export const maxDuration = 60;

const MAX_ATTEMPTS = 3;
// Leave headroom under maxDuration so we can still return a clean JSON error.
const TIME_BUDGET_MS = 55_000;
const MAX_OUTPUT_TOKENS = 8_000;

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function isSchemaMismatch(error: unknown): boolean {
  return error instanceof Error && error.name === "AI_NoObjectGeneratedError";
}

function withViolationFeedback(prompt: string, violations: string[]): string {
  return `${prompt}

IMPORTANT — YOUR PREVIOUS PLAN WAS REJECTED by the equipment validator. Produce a complete, corrected plan that fixes EVERY violation below (blocks and slots are numbered from 1, people from 0):
${violations.map((v) => `- ${v}`).join("\n")}

Re-check every slot against the equipment quantities and shared resource rules before answering.`;
}

export async function POST(request: Request) {
  try {
    const startedAt = Date.now();

    let userId: string | null = null;
    if (config.isHosted) {
      const auth = await requireAuth();
      if ("error" in auth) return auth.error;
      userId = auth.user.id;
    }

    const body = await request.json();
    const parsed = generateGroupWorkoutSchema.safeParse(body);

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

    // Hosted mode: enforce generation limits. A group request counts as ONE generation
    // regardless of how many internal attempts are needed.
    if (config.isHosted && userId) {
      const supabase = createAdminClient();
      const { data: result, error: rpcError } = await supabase.rpc(
        "check_and_increment_generation",
        { p_user_id: userId, p_timezone: body.timezone || "UTC" }
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

    const {
      profile_id,
      style,
      duration_min,
      target_rpe,
      body_groups,
      parameters,
      bodyweight,
      group_size,
      person_names,
    } = parsed.data;

    // Profile and gym data come from the client (same as the solo route).
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

    const equipment: Equipment[] = bodyweight ? [] : (body.equipment_data || []);
    const sharedResources: SharedResourceGroup[] = bodyweight ? [] : (body.shared_resources_data || []);
    const layoutNotes: string = bodyweight ? "" : (body.layout_notes || "");

    const system = buildGroupSystemPrompt(group_size, bodyweight);
    const basePrompt = buildGroupUserPrompt({
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
      groupSize: group_size,
      personNames: person_names,
    });

    const anthropic = getAIClient(apiKey);
    const model = anthropic(getModelId());

    let violations: string[] = [];
    let timedOut = false;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const remaining = TIME_BUDGET_MS - (Date.now() - startedAt);
      if (remaining <= 0) {
        timedOut = true;
        break;
      }

      const prompt = violations.length > 0
        ? withViolationFeedback(basePrompt, violations)
        : basePrompt;

      try {
        const { object } = await generateObject({
          model,
          system,
          prompt,
          schema: groupWorkoutOutputSchema,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          abortSignal: AbortSignal.timeout(remaining),
        });

        const validation = validateGroupWorkout(object, {
          equipment,
          sharedResources,
          groupSize: group_size,
          bodyweight: !!bodyweight,
        });

        if (validation.valid) {
          return Response.json({ workout: object });
        }

        violations = validation.violations;
        console.warn(
          `Group workout attempt ${attempt}/${MAX_ATTEMPTS} had ${violations.length} violation(s)`
        );
      } catch (error) {
        if (isAbortError(error)) {
          timedOut = true;
          break;
        }
        if (!isSchemaMismatch(error)) throw error;
        violations = [
          "Your previous response did not match the required JSON schema. Return every required field exactly as specified.",
        ];
      }
    }

    if (timedOut) {
      return Response.json(
        {
          error: "Generating the group workout took too long. Please try again.",
          violations,
        },
        { status: 504 }
      );
    }

    return Response.json(
      {
        error: "Couldn't build a conflict-free group workout with the available equipment. Please try again.",
        violations,
      },
      { status: 422 }
    );
  } catch (error) {
    console.error("Group workout generation error:", error);
    // Surface the upstream failure class/status (never the key) to make 500s diagnosable.
    const e = error as { name?: string; statusCode?: number; message?: string };
    const detail = [e?.name, e?.statusCode, e?.message?.slice(0, 300)].filter(Boolean).join(" | ");
    return Response.json(
      { error: "Failed to generate workout", detail },
      { status: 500 }
    );
  }
}
