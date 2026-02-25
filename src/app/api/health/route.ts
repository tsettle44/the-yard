import { config } from "@/lib/config";

export async function GET() {
  return Response.json({
    status: "ok",
    mode: config.deploymentMode,
    timestamp: new Date().toISOString(),
  });
}
