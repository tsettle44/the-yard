import { http, HttpResponse } from "msw";
import { makeProfile, makeGym, makeWorkout } from "../fixtures";

export const handlers = [
  http.get("/api/health", () => {
    return HttpResponse.json({ status: "ok", mode: "self-hosted", timestamp: new Date().toISOString() });
  }),

  http.get("/api/profiles", () => {
    return HttpResponse.json([makeProfile()]);
  }),

  http.post("/api/profiles", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...makeProfile(), ...body }, { status: 201 });
  }),

  http.get("/api/gyms", () => {
    return HttpResponse.json([makeGym()]);
  }),

  http.post("/api/gyms", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...makeGym(), ...body, equipment: [], shared_resources: [] }, { status: 201 });
  }),

  http.get("/api/workouts", () => {
    return HttpResponse.json([makeWorkout()]);
  }),

  http.post("/api/workouts", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...makeWorkout(), ...body }, { status: 201 });
  }),

  http.get("/api/entitlement", () => {
    return HttpResponse.json({
      plan: "free",
      used: 0,
      limit: 3,
      remaining: 3,
      canGenerate: true,
    });
  }),
];
