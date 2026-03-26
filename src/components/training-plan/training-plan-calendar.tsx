"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ArrowLeft, Download, Loader2 } from "lucide-react";
import type { TrainingPlanOutputType } from "@/lib/ai/training-plan-schemas";

interface TrainingPlanCalendarProps {
  plan: Partial<TrainingPlanOutputType> | null;
  isStreaming: boolean;
  error: string | null;
  onBack: () => void;
  onExport: () => void;
}

const intensityColors: Record<string, string> = {
  easy: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  moderate: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  hard: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  race: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
};

const typeIcons: Record<string, string> = {
  run: "🏃",
  strength: "💪",
  rest: "😴",
  "cross-training": "🔄",
  swim: "🏊",
  bike: "🚴",
  race: "🏁",
  recovery: "🧘",
};

function getMonthsFromSessions(
  weeks: TrainingPlanOutputType["weeks"]
): { year: number; month: number }[] {
  const months = new Map<string, { year: number; month: number }>();
  for (const week of weeks) {
    for (const session of week.sessions) {
      if (!session.date) continue;
      const d = new Date(session.date + "T00:00:00");
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!months.has(key)) {
        months.set(key, { year: d.getFullYear(), month: d.getMonth() });
      }
    }
  }
  return Array.from(months.values()).sort(
    (a, b) => a.year - b.year || a.month - b.month
  );
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

type SessionInfo = TrainingPlanOutputType["weeks"][number]["sessions"][number] & {
  week_number: number;
  phase: string;
};

export function TrainingPlanCalendar({
  plan,
  isStreaming,
  error,
  onBack,
  onExport,
}: TrainingPlanCalendarProps) {
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null);

  const months = useMemo(() => {
    if (!plan?.weeks?.length) return [];
    return getMonthsFromSessions(plan.weeks as TrainingPlanOutputType["weeks"]);
  }, [plan?.weeks]);

  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, SessionInfo>();
    if (!plan?.weeks) return map;
    for (const week of plan.weeks) {
      if (!week.sessions) continue;
      for (const session of week.sessions) {
        if (!session.date) continue;
        map.set(session.date, {
          ...session,
          week_number: week.week_number,
          phase: week.phase,
        } as SessionInfo);
      }
    }
    return map;
  }, [plan?.weeks]);

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isStreaming && !plan?.weeks?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {plan?.plan_name ? `Creating: ${plan.plan_name}` : "Generating your training plan..."}
            </p>
            {plan?.overview && (
              <p className="text-xs text-muted-foreground max-w-md mx-auto">{plan.overview}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!plan?.weeks?.length) {
    return null;
  }

  const currentMonth = months[currentMonthIndex] || months[0];
  if (!currentMonth) return null;

  const daysInMonth = getDaysInMonth(currentMonth.year, currentMonth.month);
  const firstDay = getFirstDayOfWeek(currentMonth.year, currentMonth.month);
  const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleString(
    "default",
    { month: "long", year: "numeric" }
  );

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {isStreaming && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!isStreaming && plan?.weeks && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="mr-1 h-4 w-4" />
              Export iCal
            </Button>
          )}
        </div>
      </div>

      {/* Plan overview */}
      {plan.plan_name && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{plan.plan_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.overview && (
              <p className="text-sm text-muted-foreground">{plan.overview}</p>
            )}
            {plan.phases && plan.phases.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {plan.phases.map((phase, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {phase.name}: {phase.weeks}
                  </Badge>
                ))}
              </div>
            )}
            {plan.total_weeks && (
              <p className="text-xs text-muted-foreground">
                {plan.total_weeks} weeks &middot; {plan.event_type?.replace(/_/g, " ")} &middot; {plan.event_date}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonthIndex(Math.max(0, currentMonthIndex - 1))}
              disabled={currentMonthIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{monthName}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setCurrentMonthIndex(Math.min(months.length - 1, currentMonthIndex + 1))
              }
              disabled={currentMonthIndex >= months.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div
                key={day}
                className="text-center text-[10px] font-medium text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px">
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="min-h-[4rem]" />;
              }

              const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const session = sessionsByDate.get(dateStr);

              return (
                <div
                  key={dateStr}
                  className={`min-h-[4rem] p-1 border border-border/50 cursor-pointer transition-colors hover:bg-muted/50 ${
                    session ? "" : "opacity-60"
                  } ${
                    selectedSession?.date === dateStr ? "ring-1 ring-foreground" : ""
                  }`}
                  onClick={() => session && setSelectedSession(session)}
                >
                  <div className="text-[10px] text-muted-foreground">{day}</div>
                  {session && (
                    <div className="mt-0.5">
                      <div className="text-[10px] leading-tight">
                        {typeIcons[session.type] || "📋"}{" "}
                      </div>
                      <div
                        className={`text-[9px] leading-tight mt-0.5 px-1 py-0.5 rounded ${
                          intensityColors[session.intensity] || ""
                        }`}
                      >
                        {session.title?.length > 12
                          ? session.title.slice(0, 12) + "..."
                          : session.title}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Session detail */}
      {selectedSession && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {typeIcons[selectedSession.type] || "📋"} {selectedSession.title}
              </CardTitle>
              <Badge
                variant="outline"
                className={intensityColors[selectedSession.intensity] || ""}
              >
                {selectedSession.intensity}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedSession.day_of_week}, {selectedSession.date} &middot;{" "}
              {selectedSession.duration_minutes} min &middot; Week {selectedSession.week_number} ({selectedSession.phase})
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{selectedSession.description}</p>
            {selectedSession.details && selectedSession.details.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Details
                </p>
                <ul className="space-y-1">
                  {selectedSession.details.map((detail, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-muted-foreground/50 mt-1">•</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Race day tips and notes */}
      {!isStreaming && plan.race_day_tips && plan.race_day_tips.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">🏁 Race Day Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {plan.race_day_tips.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-muted-foreground/50 mt-1">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!isStreaming && plan.notes && plan.notes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">📝 Important Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {plan.notes.map((note, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-muted-foreground/50 mt-1">•</span>
                  {note}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
