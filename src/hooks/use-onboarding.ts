"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { config } from "@/lib/config";

const BASE_KEY = "the-yard-onboarding-completed";

export function useOnboarding() {
  const [userKey, setUserKey] = useState<string>(BASE_KEY);
  const [keyResolved, setKeyResolved] = useState(!config.isHosted);

  // In hosted mode, append userId to the storage key
  useEffect(() => {
    if (!config.isHosted) return;

    let cancelled = false;
    async function resolveKey() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const { data } = await createClient().auth.getUser();
        if (!cancelled && data.user) {
          setUserKey(`${BASE_KEY}-${data.user.id}`);
        }
      } finally {
        if (!cancelled) setKeyResolved(true);
      }
    }
    resolveKey();
    return () => { cancelled = true; };
  }, []);

  const [completed, setCompleted, hydrated] = useLocalStorage(userKey, false);

  const shouldShowTour = hydrated && keyResolved && !completed;

  const completeTour = useCallback(() => {
    setCompleted(true);
  }, [setCompleted]);

  const resetTour = useCallback(() => {
    setCompleted(false);
  }, [setCompleted]);

  return { shouldShowTour, completeTour, resetTour, hydrated: hydrated && keyResolved };
}
