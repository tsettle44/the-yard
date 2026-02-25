"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
      className={`cursor-pointer transition-colors ${isActive ? "border-primary" : "hover:border-primary/50"}`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{profile.name}</CardTitle>
          <div className="flex items-center gap-1">
            {isActive && <Check className="h-4 w-4 text-primary" />}
            {profile.is_default && <Badge variant="secondary">Default</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline">{profile.fitness_level}</Badge>
          {profile.preferred_styles.map((style) => (
            <Badge key={style} variant="outline">
              {style}
            </Badge>
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
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
