"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Program } from "@/types/program";
import { Trash2 } from "lucide-react";

const templateNames: Record<string, string> = {
  ppl: "PPL",
  upper_lower: "Upper / Lower",
  full_body: "Full Body",
  strength_builder: "Strength",
  custom: "Custom",
};

interface ProgramCardProps {
  program: Program;
  onSelect: () => void;
  onDelete: () => void;
}

export function ProgramCard({ program, onSelect, onDelete }: ProgramCardProps) {
  const progressPercent = Math.round(
    ((program.current_week - 1) / program.total_weeks) * 100
  );

  return (
    <Card className="cursor-pointer hover:border-foreground/20 transition-colors" onClick={onSelect}>
      <CardHeader className="py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm truncate">{program.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {program.total_weeks} weeks · {program.days_per_week} days/week
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant={program.status === "active" ? "default" : "secondary"} className="text-[10px]">
              {program.status}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {templateNames[program.template] || program.template}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Week {program.current_week} of {program.total_weeks}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {new Date(program.created_at).toLocaleDateString()}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
