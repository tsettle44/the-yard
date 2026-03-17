"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Dumbbell,
  Users,
  Warehouse,
  Zap,
  History,
  Rocket,
} from "lucide-react";

const steps = [
  {
    icon: Dumbbell,
    title: "Welcome to The Yard",
    description: "Your AI-powered workout generator",
    body: "The Yard builds personalized workouts based on your fitness profile, available equipment, and training preferences. No cookie-cutter programs — every session is tailored to you.",
  },
  {
    icon: Users,
    title: "Create Profiles",
    description: "Tell us about yourself",
    body: "Set up one or more profiles with your fitness level, training goals, and any injury notes. Each profile gets its own personalized workout recommendations.",
  },
  {
    icon: Warehouse,
    title: "Configure Your Gym",
    description: "Add your equipment in Settings",
    body: "Head to Settings to add the equipment you have access to. Define shared resources like barbells so the AI can plan smooth transitions between exercises.",
  },
  {
    icon: Zap,
    title: "Generate Workouts",
    description: "AI-powered session planning",
    body: "Choose your workout style, duration, RPE target, and body groups. The AI streams a complete workout plan with exercises, sets, reps, and rest periods.",
  },
  {
    icon: History,
    title: "Track Your Progress",
    description: "Save and review past sessions",
    body: "Save generated workouts to your history. Rate them after completion and review past sessions to track your training over time.",
  },
  {
    icon: Rocket,
    title: "You're All Set",
    description: "Time to start training",
    body: "Create your first profile to get started. Once you've set up your gym equipment, you'll be ready to generate your first personalized workout.",
  },
];

interface OnboardingTourProps {
  open: boolean;
  onComplete: () => void;
}

export function OnboardingTour({ open, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="flex items-center justify-center mb-2">
            <Icon className="h-10 w-10" />
          </div>
          <DialogTitle className="text-sm font-black uppercase tracking-[0.15em]">
            {step.title}
          </DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-wider">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground text-center px-2">
          {step.body}
        </p>

        <DialogFooter className="flex flex-row items-center justify-between gap-2 sm:justify-between" showCloseButton={false}>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs uppercase tracking-wider"
            onClick={onComplete}
          >
            Skip
          </Button>

          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === currentStep ? "bg-foreground" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <Button
            size="sm"
            className="text-xs uppercase tracking-wider"
            onClick={() => {
              if (isLastStep) {
                onComplete();
              } else {
                setCurrentStep((s) => s + 1);
              }
            }}
          >
            {isLastStep ? "Get Started" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
