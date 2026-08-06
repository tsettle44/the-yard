"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProfiles } from "@/hooks/use-profile";
import { ProfileFormDialog } from "@/components/profiles/profile-form-dialog";
import { ProfileCard } from "@/components/profiles/profile-card";
import { Button } from "@/components/ui/button";
import { Profile } from "@/types/profile";
import { Plus, Settings, Calendar } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const {
    profiles,
    activeProfileId,
    setActiveProfileId,
    addProfile,
    updateProfile,
    deleteProfile,
    setGuestMode,
    hydrated,
  } = useProfiles();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full">
          <div className="h-6 bg-muted w-64 mx-auto" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-40 bg-muted" />
            <div className="h-40 bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  function handleSelectProfile(profileId: string) {
    setGuestMode(false);
    setActiveProfileId(profileId);
    router.push("/generate");
  }

  function handleGuestMode() {
    setGuestMode(true);
    setActiveProfileId(null);
    router.push("/generate");
  }

  function handleCreateProfile() {
    setEditingProfile(null);
    setDialogOpen(true);
  }

  function handleEditProfile(profile: Profile) {
    setEditingProfile(profile);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full space-y-8 text-center">
        <p className="text-sm uppercase tracking-widest text-muted-foreground font-medium">
          Who&apos;s working out?
        </p>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isActive={profile.id === activeProfileId}
              onSelect={() => handleSelectProfile(profile.id)}
              onEdit={() => handleEditProfile(profile)}
              onDelete={() => deleteProfile(profile.id)}
            />
          ))}

          <div
            className="cursor-pointer border border-dashed border-border hover:border-foreground/30 transition-colors flex flex-col items-center justify-center min-h-[140px] gap-2"
            onClick={handleCreateProfile}
          >
            <Plus className="h-8 w-8 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              New Profile
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={handleGuestMode}
          >
            Continue as Guest
          </Button>
        </div>

        <div className="flex items-center justify-center gap-6">
          <Link
            href="/training-plans"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <Calendar className="h-3.5 w-3.5" />
            Training Plans
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Link>
        </div>
      </div>

      <ProfileFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profile={editingProfile}
        onSubmit={(values) => {
          if (editingProfile) {
            updateProfile(editingProfile.id, values);
          } else {
            const profile = addProfile(values);
            if (profiles.length === 0) {
              setActiveProfileId(profile.id);
            }
          }
        }}
      />
    </div>
  );
}
