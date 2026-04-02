"use client";

import Link from "next/link";
import { usePrograms } from "@/hooks/use-programs";
import { ProgramCard } from "@/components/program/program-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ProgramsPage() {
  const { programs, deleteProgram, hydrated } = usePrograms();

  if (!hydrated) {
    return <div className="animate-pulse space-y-4"><div className="h-64 bg-muted rounded-lg" /></div>;
  }

  const activePrograms = programs.filter((p) => p.status === "active");
  const completedPrograms = programs.filter((p) => p.status !== "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Programs</h1>
        <Link href="/programs/generate">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> New Program
          </Button>
        </Link>
      </div>

      {programs.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          <p>No programs yet.</p>
          <p className="mt-1">Create a multi-week training program to get started.</p>
        </div>
      )}

      {activePrograms.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active</h2>
          {activePrograms.map((program) => (
            <Link key={program.id} href={`/programs/${program.id}`}>
              <ProgramCard
                program={program}
                onSelect={() => {}}
                onDelete={() => deleteProgram(program.id)}
              />
            </Link>
          ))}
        </div>
      )}

      {completedPrograms.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed & Paused</h2>
          {completedPrograms.map((program) => (
            <Link key={program.id} href={`/programs/${program.id}`}>
              <ProgramCard
                program={program}
                onSelect={() => {}}
                onDelete={() => deleteProgram(program.id)}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
