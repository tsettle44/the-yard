"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "./use-local-storage";
import { Profile, ProfileInsert } from "@/types/profile";
import { config } from "@/lib/config";

function generateId() {
  return crypto.randomUUID();
}

export function useProfiles() {
  const [profiles, setProfiles, hydrated] = useLocalStorage<Profile[]>("the-yard-profiles", []);
  const [activeProfileId, setActiveProfileId] = useLocalStorage<string | null>(
    "the-yard-active-profile",
    null
  );
  const [guestMode, setGuestMode] = useLocalStorage<boolean>("the-yard-guest-mode", false);
  const [loading, setLoading] = useState(!config.isSelfHosted);

  const activeProfile = guestMode
    ? null
    : profiles.find((p) => p.id === activeProfileId) || profiles.find((p) => p.is_default) || profiles[0] || null;

  useEffect(() => {
    if (config.isSelfHosted) return;
    // In hosted mode, fetch profiles from Supabase
    async function fetchProfiles() {
      try {
        const res = await fetch("/api/profiles");
        if (res.ok) {
          const data = await res.json();
          setProfiles(data);
        }
      } catch (error) {
        console.error("Failed to fetch profiles:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfiles();
  }, [setProfiles]);

  const addProfile = useCallback(
    (data: Omit<ProfileInsert, "user_id">) => {
      const now = new Date().toISOString();
      const profile: Profile = {
        id: generateId(),
        user_id: null,
        ...data,
        created_at: now,
        updated_at: now,
      };
      setProfiles((prev) => {
        if (profile.is_default) {
          return [...prev.map((p) => ({ ...p, is_default: false })), profile];
        }
        return [...prev, profile];
      });
      return profile;
    },
    [setProfiles]
  );

  const updateProfile = useCallback(
    (id: string, data: Partial<ProfileInsert>) => {
      setProfiles((prev) =>
        prev.map((p) => {
          if (p.id !== id) {
            if (data.is_default) return { ...p, is_default: false };
            return p;
          }
          return { ...p, ...data, updated_at: new Date().toISOString() };
        })
      );
    },
    [setProfiles]
  );

  const deleteProfile = useCallback(
    (id: string) => {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      if (activeProfileId === id) {
        setActiveProfileId(null);
      }
    },
    [setProfiles, activeProfileId, setActiveProfileId]
  );

  return {
    profiles,
    activeProfile,
    activeProfileId,
    setActiveProfileId,
    addProfile,
    updateProfile,
    deleteProfile,
    guestMode,
    setGuestMode,
    loading,
    hydrated,
  };
}
