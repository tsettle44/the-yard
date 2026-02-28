"use client";

import { useState, useEffect, useCallback } from "react";
import { config } from "@/lib/config";

interface EntitlementData {
  plan: "free" | "paid";
  used: number;
  limit: number;
  remaining: number;
  canGenerate: boolean;
}

interface UseEntitlementReturn {
  plan: "free" | "paid" | null;
  remaining: number;
  canGenerate: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useEntitlement(): UseEntitlementReturn {
  const [data, setData] = useState<EntitlementData | null>(null);
  const [loading, setLoading] = useState(config.isHosted);

  const refresh = useCallback(async () => {
    if (!config.isHosted) return;

    try {
      setLoading(true);
      const res = await fetch("/api/entitlement");
      if (res.ok) {
        const json: EntitlementData = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch entitlement:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!config.isHosted) {
    return { plan: null, remaining: Infinity, canGenerate: true, loading: false, refresh };
  }

  return {
    plan: data?.plan ?? null,
    remaining: data?.remaining ?? 0,
    canGenerate: data?.canGenerate ?? false,
    loading,
    refresh,
  };
}
