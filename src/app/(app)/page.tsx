"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProfiles } from "@/hooks/use-profile";
import { ProfileFormDialog } from "@/components/profiles/profile-form-dialog";
import { ProfileCard } from "@/components/profiles/profile-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Profile } from "@/types/profile";
import { Plus, Settings, UserX } from "lucide-react";

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
      <div className="flex items-center justify-center p-4">
        <div className="animate-pulse space-y-4 w-full max-w-2xl">
          <div className="h-6 bg-muted rounded-lg w-64 mx-auto" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-40 bg-muted rounded-lg" />
            <div className="h-40 bg-muted rounded-lg" />
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
    <div className="flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-8 text-center">
        <p className="text-lg text-muted-foreground">
          Who&apos;s working out?
        </p>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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

          <Card
            className="cursor-pointer border-dashed border-2 hover:border-primary/50 transition-colors flex flex-col items-center justify-center min-h-[140px] gap-2"
            onClick={handleCreateProfile}
          >
            <Plus className="h-10 w-10 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              New Profile
            </span>
          </Card>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={handleGuestMode}
          >
            <UserX className="mr-2 h-4 w-4" />
            Continue as Guest
          </Button>
        </div>

        <div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
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
