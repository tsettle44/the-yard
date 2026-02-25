"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Zap, Settings, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            The Yard
          </h1>
          <p className="text-lg text-muted-foreground">
            AI-powered workout generator for your home gym
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <Dumbbell className="h-8 w-8 mx-auto mb-2 text-primary" />
              <CardTitle className="text-base">Configure</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Set up your equipment and space constraints
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
              <CardTitle className="text-base">Generate</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get personalized workouts from AI that knows your gym
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <Settings className="h-8 w-8 mx-auto mb-2 text-primary" />
              <CardTitle className="text-base">Customize</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Adjust style, duration, intensity, and body focus
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/profile">
            <Button size="lg" className="w-full sm:w-auto">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/gym">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Set Up Gym
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
