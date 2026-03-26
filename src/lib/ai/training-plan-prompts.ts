import { TrainingPlanRequest } from "@/types/training-plan";

export function buildTrainingPlanSystemPrompt(): string {
  return `You are an expert endurance and fitness coach who creates detailed, periodized training plans. You design plans that are safe, progressive, and tailored to the athlete's goals, experience level, and schedule.

CRITICAL RULES:

1. Only schedule training on the athlete's available days. Rest days are any day not in their available days list.

2. Respect the athlete's time constraints. Sessions should fit within their stated hours per day.

3. Follow proper periodization principles:
   - Base/Foundation phase: Build aerobic base, establish habits
   - Build phase: Increase intensity and volume progressively
   - Peak phase: Race-specific work, highest training load
   - Taper phase: Reduce volume while maintaining intensity before the event

4. Never increase weekly volume by more than 10% week over week.

5. Include recovery weeks every 3-4 weeks (reduce volume by 30-40%).

6. Account for any injuries or limitations mentioned.

7. Each session must have a clear purpose and detailed breakdown.

8. Assign real calendar dates to every session based on the event date and working backwards.

9. Scale the plan length appropriately:
   - 5K: 6-10 weeks
   - 10K: 8-12 weeks
   - Half Marathon: 10-16 weeks
   - Marathon: 14-20 weeks
   - Hyrox: 10-16 weeks
   - Triathlon: 12-20 weeks
   - General fitness: 8-12 weeks

10. For multi-sport events (Hyrox, triathlon, Spartan), include sport-specific training for each discipline.

OUTPUT FORMAT:
- Provide a complete week-by-week plan with specific sessions.
- Each session needs a date, title, type, duration, description, intensity level, and detailed breakdown.
- Group weeks into named phases.
- Include race day tips and important notes.`;
}

export function buildTrainingPlanUserPrompt(req: TrainingPlanRequest): string {
  const dayNames = req.available_days
    .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
    .join(", ");

  const sections: string[] = [
    `Create a training plan for the following event:`,
    ``,
    `**Event:** ${req.event_name} (${req.event_type.replace(/_/g, " ")})`,
    `**Event Date:** ${req.event_date}`,
    `**Experience Level:** ${req.experience_level}`,
    ``,
    `**Schedule:**`,
    `- Available training days: ${dayNames}`,
    `- Time per session: up to ${req.hours_per_day} hour${req.hours_per_day !== 1 ? "s" : ""}`,
  ];

  if (req.goals) {
    sections.push(``, `**Goals:** ${req.goals}`);
  }
  if (req.current_fitness) {
    sections.push(``, `**Current Fitness:** ${req.current_fitness}`);
  }
  if (req.injuries_limitations) {
    sections.push(``, `**Injuries/Limitations:** ${req.injuries_limitations}`);
  }
  if (req.equipment_available) {
    sections.push(``, `**Equipment Available:** ${req.equipment_available}`);
  }
  if (req.additional_notes) {
    sections.push(``, `**Additional Notes:** ${req.additional_notes}`);
  }

  sections.push(
    ``,
    `Today's date is ${new Date().toISOString().split("T")[0]}. Calculate the number of weeks until the event and create an appropriately structured plan. Assign real calendar dates (YYYY-MM-DD) to every session, starting from the upcoming week and ending at the event date. Only schedule sessions on the available training days listed above.`
  );

  return sections.join("\n");
}
