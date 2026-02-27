"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "./use-local-storage";
import { Profile, ProfileInsert } from "@/types/profile";
import { config } from "@/lib/config";

const isHosted = config.isHosted;

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
  const [loading, setLoading] = useState(isHosted);

  const activeProfile = guestMode
    ? null
    : profiles.find((p) => p.id === activeProfileId) || profiles.find((p) => p.is_default) || profiles[0] || null;

  // In hosted mode, fetch profiles from API on mount
  useEffect(() => {
    if (!isHosted) return;
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

      if (isHosted) {
        fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
          .then((res) => res.json())
          .then((serverProfile) => {
            // Replace optimistic profile with server version (gets real UUID)
            setProfiles((prev) =>
              prev.map((p) => (p.id === profile.id ? { ...serverProfile } : p))
            );
            // Update active profile ID if it was pointing to the optimistic ID
            setActiveProfileId((prev) =>
              prev === profile.id ? serverProfile.id : prev
            );
          })
          .catch((err) => console.error("Failed to save profile:", err));
      }

      return profile;
    },
    [setProfiles, setActiveProfileId]
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

      if (isHosted) {
        fetch(`/api/profiles/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }).catch((err) => console.error("Failed to update profile:", err));
      }
    },
    [setProfiles]
  );

  const deleteProfile = useCallback(
    (id: string) => {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      if (activeProfileId === id) {
        setActiveProfileId(null);
      }

      if (isHosted) {
        fetch(`/api/profiles/${id}`, { method: "DELETE" }).catch((err) =>
          console.error("Failed to delete profile:", err)
        );
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
