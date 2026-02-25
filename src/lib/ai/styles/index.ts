import { WorkoutStyle } from "@/types/workout";

export interface StyleDefinition {
  slug: WorkoutStyle;
  name: string;
  description: string;
  defaultDuration: number;
  defaultRpe: number;
}

export const workoutStyles: StyleDefinition[] = [
  {
    slug: "strength",
    name: "Strength",
    description: "Traditional strength training with compound and isolation movements",
    defaultDuration: 60,
    defaultRpe: 7,
  },
  {
    slug: "hiit",
    name: "HIIT",
    description: "High-intensity interval training with work/rest periods",
    defaultDuration: 30,
    defaultRpe: 8,
  },
  {
    slug: "circuit",
    name: "Circuit",
    description: "Circuit-style training rotating through stations",
    defaultDuration: 45,
    defaultRpe: 7,
  },
  {
    slug: "emom",
    name: "EMOM",
    description: "Every Minute on the Minute — perform reps at the start of each minute",
    defaultDuration: 20,
    defaultRpe: 7,
  },
  {
    slug: "amrap",
    name: "AMRAP",
    description: "As Many Rounds as Possible in a given time cap",
    defaultDuration: 20,
    defaultRpe: 8,
  },
  {
    slug: "tabata",
    name: "Tabata",
    description: "20 seconds work / 10 seconds rest for 8 rounds per exercise",
    defaultDuration: 20,
    defaultRpe: 9,
  },
  {
    slug: "custom",
    name: "Custom",
    description: "Describe your own workout style in the notes",
    defaultDuration: 45,
    defaultRpe: 7,
  },
];

export function getStyleBySlug(slug: WorkoutStyle): StyleDefinition | undefined {
  return workoutStyles.find((s) => s.slug === slug);
}
