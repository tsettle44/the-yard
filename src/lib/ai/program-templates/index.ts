import { ProgramTemplate } from "@/types/program";

export interface ProgramTemplateDefinition {
  slug: ProgramTemplate;
  name: string;
  description: string;
  defaultWeeks: number;
  defaultDaysPerWeek: number;
  defaultRpe: number;
}

export const programTemplates: ProgramTemplateDefinition[] = [
  {
    slug: "ppl",
    name: "Push / Pull / Legs",
    description: "Classic 6-day split. Push muscles, pull muscles, and legs each get two dedicated days per week.",
    defaultWeeks: 4,
    defaultDaysPerWeek: 6,
    defaultRpe: 7,
  },
  {
    slug: "upper_lower",
    name: "Upper / Lower",
    description: "4-day split alternating upper and lower body sessions with built-in rest days.",
    defaultWeeks: 4,
    defaultDaysPerWeek: 4,
    defaultRpe: 7,
  },
  {
    slug: "full_body",
    name: "Full Body",
    description: "3 full-body sessions per week. Great for beginners or time-constrained schedules.",
    defaultWeeks: 4,
    defaultDaysPerWeek: 3,
    defaultRpe: 7,
  },
  {
    slug: "strength_builder",
    name: "Strength Builder",
    description: "4-day program focused on the big compound lifts with structured progressive overload.",
    defaultWeeks: 6,
    defaultDaysPerWeek: 4,
    defaultRpe: 8,
  },
  {
    slug: "custom",
    name: "Custom",
    description: "Describe your own program structure in the notes.",
    defaultWeeks: 4,
    defaultDaysPerWeek: 4,
    defaultRpe: 7,
  },
];

export function getTemplateBySlug(slug: ProgramTemplate): ProgramTemplateDefinition | undefined {
  return programTemplates.find((t) => t.slug === slug);
}
