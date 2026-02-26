"use client";

import { Profile } from "@/types/profile";
import { ProfileForm } from "./profile-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ProfileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: Profile | null;
  onSubmit: (values: Parameters<React.ComponentProps<typeof ProfileForm>["onSubmit"]>[0]) => void;
}

export function ProfileFormDialog({
  open,
  onOpenChange,
  profile,
  onSubmit,
}: ProfileFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-auto max-h-[85vh] sm:max-w-lg p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{profile ? "Edit Profile" : "New Profile"}</DialogTitle>
          <DialogDescription>
            {profile ? "Update your profile details." : "Create a new athlete profile."}
          </DialogDescription>
        </DialogHeader>
        <ProfileForm
          initialValues={
            profile
              ? {
                  name: profile.name,
                  fitness_level: profile.fitness_level,
                  preferred_styles: profile.preferred_styles,
                  goals: profile.goals,
                  preferences: profile.preferences,
                  is_default: profile.is_default,
                }
              : undefined
          }
          onSubmit={(values) => {
            onSubmit(values);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
          submitLabel={profile ? "Update Profile" : "Create Profile"}
        />
      </DialogContent>
    </Dialog>
  );
}
