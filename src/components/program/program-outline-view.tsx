"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgramOutlineOutput } from "@/lib/ai/schemas-program";
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, Save } from "lucide-react";

interface ProgramOutlineViewProps {
  outline: Partial<ProgramOutlineOutput> | null;
  isStreaming: boolean;
  error: string | null;
  onSave?: () => void;
  onBack: () => void;
  onGenerateDay?: (weekNumber: number, dayNumber: number) => void;
}

export function ProgramOutlineView({
  outline,
  isStreaming,
  error,
  onSave,
  onBack,
  onGenerateDay,
}: ProgramOutlineViewProps) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!outline && isStreaming) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Generating program outline...</p>
        </CardContent>
      </Card>
    );
  }

  if (!outline) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg truncate">{outline.name || "Program"}</h2>
          {outline.description && (
            <p className="text-xs text-muted-foreground">{outline.description}</p>
          )}
        </div>
      </div>

      {outline.progression_strategy && (
        <Card>
          <CardContent className="py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Progression</p>
            <p className="text-sm">{outline.progression_strategy}</p>
          </CardContent>
        </Card>
      )}

      {outline.weeks?.map((week) => (
        <Card key={week.week_number}>
          <CardHeader
            className="cursor-pointer py-3"
            onClick={() => setExpandedWeek(expandedWeek === week.week_number ? null : week.week_number)}
          >
            <div className="flex items-center gap-2">
              {expandedWeek === week.week_number ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              <CardTitle className="text-sm flex-1">
                Week {week.week_number}
                <span className="font-normal text-muted-foreground ml-2">— {week.theme}</span>
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {week.intensity_modifier}
              </Badge>
            </div>
          </CardHeader>

          {expandedWeek === week.week_number && (
            <CardContent className="pt-0 space-y-3">
              {week.days?.map((day) => (
                <div
                  key={day.day_number}
                  className="border border-border p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{day.name}</p>
                      <p className="text-xs text-muted-foreground">{day.focus}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{day.duration_min}min</Badge>
                      <Badge variant="outline" className="text-[10px]">RPE {day.target_rpe}</Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {day.body_groups?.map((bg) => (
                      <Badge key={bg} variant="secondary" className="text-[10px]">
                        {bg.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>

                  {day.key_lifts?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Key lifts: {day.key_lifts.join(", ")}
                    </p>
                  )}

                  {day.notes && (
                    <p className="text-xs text-muted-foreground italic">{day.notes}</p>
                  )}

                  {onGenerateDay && !isStreaming && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => onGenerateDay(week.week_number, day.day_number)}
                    >
                      Generate This Workout
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      ))}

      {outline.coaching && outline.coaching.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Coaching Tips</p>
            <ul className="space-y-1">
              {outline.coaching.map((tip, i) => (
                <li key={i} className="text-sm">• {tip}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {isStreaming && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Streaming...
        </div>
      )}

      {!isStreaming && outline.weeks && outline.weeks.length > 0 && (
        <div className="flex gap-2">
          {onSave && (
            <Button onClick={onSave} className="flex-1">
              <Save className="mr-2 h-4 w-4" /> Save Program
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
