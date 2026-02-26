"use client";

import Link from "next/link";
import { useProfiles } from "@/hooks/use-profile";
import { Badge } from "@/components/ui/badge";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { activeProfile, guestMode } = useProfiles();

  const profileLabel = guestMode ? "Guest" : activeProfile?.name || null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 max-w-screen-xl items-center px-4">
          <Link href="/" className="font-bold text-lg mr-2">
            The Yard
          </Link>
          {profileLabel && (
            <Badge variant="secondary" className="mr-6">
              {profileLabel}
            </Badge>
          )}
        </div>
      </header>

      <main className="flex-1 container max-w-screen-xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
