"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Profile } from "@/types/profile";
import { Pencil, Trash2, Check } from "lucide-react";

interface ProfileCardProps {
  profile: Profile;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProfileCard({
  profile,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: ProfileCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-colors ${isActive ? "border-foreground" : "hover:border-foreground/30"}`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="font-black text-sm uppercase tracking-[0.15em]">{profile.name}</span>
          <div className="flex items-center gap-1">
            {isActive && <Check className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5">
            {profile.fitness_level}
          </span>
          {profile.preferred_styles.map((style) => (
            <span key={style} className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5">
              {style}
            </span>
          ))}
        </div>
        {profile.goals && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {profile.goals}
          </p>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <div className="flex gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
