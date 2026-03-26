import type { TrainingPlanOutputType } from "@/lib/ai/training-plan-schemas";

function escapeIcal(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatDateIcal(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function generateUid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}@the-yard`;
}

export function generateIcal(plan: TrainingPlanOutputType): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Yard//Training Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcal(plan.plan_name)}`,
  ];

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (!session.date) continue;

      const dateFormatted = formatDateIcal(session.date);
      const details = session.details?.length
        ? `\\n\\nDetails:\\n${session.details.map((d) => `- ${escapeIcal(d)}`).join("\\n")}`
        : "";

      const description = `${escapeIcal(session.description)}\\n\\nWeek ${week.week_number} - ${escapeIcal(week.phase)}\\nIntensity: ${session.intensity}\\nDuration: ${session.duration_minutes} min${details}`;

      lines.push(
        "BEGIN:VEVENT",
        `UID:${generateUid()}`,
        `DTSTART;VALUE=DATE:${dateFormatted}`,
        `SUMMARY:${escapeIcal(session.title)} (${session.type})`,
        `DESCRIPTION:${description}`,
        `CATEGORIES:${escapeIcal(week.phase)}`,
        `X-TRAINING-INTENSITY:${session.intensity}`,
        `X-TRAINING-DURATION:${session.duration_minutes}`,
        "END:VEVENT"
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcal(plan: TrainingPlanOutputType): void {
  const ical = generateIcal(plan);
  const blob = new Blob([ical], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${plan.plan_name.replace(/\s+/g, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
