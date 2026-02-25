"use client";

import { useState } from "react";
import { useProfiles } from "@/hooks/use-profile";
import { ProfileForm } from "@/components/profiles/profile-form";
import { ProfileCard } from "@/components/profiles/profile-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ProfilePage() {
  const {
    profiles,
    activeProfileId,
    setActiveProfileId,
    addProfile,
    updateProfile,
    deleteProfile,
    hydrated,
  } = useProfiles();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!hydrated) {
    return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-lg" /><div className="h-32 bg-muted rounded-lg" /></div>;
  }

  const editingProfile = editingId ? profiles.find((p) => p.id === editingId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profiles</h1>
          <p className="text-muted-foreground">
            Manage your athlete profiles for personalized workouts
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); }}>
          <Plus className="mr-2 h-4 w-4" /> New Profile
        </Button>
      </div>

      {(showForm || editingId) && (
        <ProfileForm
          initialValues={
            editingProfile
              ? {
                  name: editingProfile.name,
                  fitness_level: editingProfile.fitness_level,
                  preferred_styles: editingProfile.preferred_styles,
                  goals: editingProfile.goals,
                  preferences: editingProfile.preferences,
                  is_default: editingProfile.is_default,
                }
              : undefined
          }
          onSubmit={(values) => {
            if (editingId) {
              updateProfile(editingId, values);
            } else {
              const profile = addProfile(values);
              if (profiles.length === 0) setActiveProfileId(profile.id);
            }
            setShowForm(false);
            setEditingId(null);
          }}
          onCancel={() => { setShowForm(false); setEditingId(null); }}
          submitLabel={editingId ? "Update Profile" : "Create Profile"}
        />
      )}

      {profiles.length === 0 && !showForm ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No profiles yet. Create your first profile to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isActive={profile.id === activeProfileId}
              onSelect={() => setActiveProfileId(profile.id)}
              onEdit={() => { setEditingId(profile.id); setShowForm(false); }}
              onDelete={() => deleteProfile(profile.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
