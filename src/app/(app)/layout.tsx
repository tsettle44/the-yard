"use client";

import Link from "next/link";
import { useProfiles } from "@/hooks/use-profile";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { activeProfile, guestMode } = useProfiles();

  const profileLabel = guestMode ? "GUEST" : activeProfile?.name?.toUpperCase() || null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="flex h-12 max-w-2xl mx-auto items-center px-4">
          <Link href="/" className="font-black text-sm uppercase tracking-[0.2em] mr-4">
            The Yard
          </Link>
          {profileLabel && (
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {profileLabel}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 w-full px-4 py-6">
        <div className="mx-auto max-w-2xl">
          {children}
        </div>
      </main>
    </div>
  );
}
