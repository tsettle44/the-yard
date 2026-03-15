"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProfiles } from "@/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const emptySubscribe = () => () => {};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { activeProfile, guestMode } = useProfiles();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const profileLabel = mounted
    ? (guestMode ? "GUEST" : activeProfile?.name?.toUpperCase() || null)
    : null;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="flex h-12 max-w-2xl mx-auto items-center px-4">
          <Link href="/" className="font-black text-sm uppercase tracking-[0.2em] mr-4">
            The Yard
          </Link>
          {mounted && profileLabel && (
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {profileLabel}
            </span>
          )}
          {mounted && config.isHosted && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
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
