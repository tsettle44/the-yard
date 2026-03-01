"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function UpgradeCard() {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/payment/create-checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
        setLoading(false);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unlock The Yard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>You&apos;ve used all your free generations.</p>
        <ul className="list-disc list-inside space-y-1">
          <li>3 workouts per day</li>
          <li>One-time purchase — $9.99</li>
          <li>No subscription, no recurring fees</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button onClick={handleUpgrade} disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Upgrade for $9.99
        </Button>
      </CardFooter>
    </Card>
  );
}
