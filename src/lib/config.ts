export type DeploymentMode = "self-hosted" | "hosted";

export const config = {
  deploymentMode: (process.env.NEXT_PUBLIC_DEPLOYMENT_MODE || process.env.DEPLOYMENT_MODE || "self-hosted") as DeploymentMode,

  get isSelfHosted() {
    return this.deploymentMode === "self-hosted";
  },

  get isHosted() {
    return this.deploymentMode === "hosted";
  },

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    priceId: process.env.STRIPE_PRICE_ID || "",
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  },

  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    name: "The Yard",
    description: "AI-powered workout generator for your home gym",
  },

  features: {
    payment: process.env.FEATURE_PAYMENT === "true",
    pwa: process.env.FEATURE_PWA !== "false",
  },

  freeGenerations: 3,
} as const;
