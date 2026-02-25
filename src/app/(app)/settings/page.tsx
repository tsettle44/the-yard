"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Workout } from "@/types/workout";
import { toast } from "sonner";
import { Download, Upload, Trash2, Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [apiKey, setApiKey] = useLocalStorage<string>("the-yard-api-key", "");
  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey);
  const [workouts] = useLocalStorage<Workout[]>("the-yard-workout-history", []);

  function handleSaveKey() {
    setApiKey(keyInput);
    toast.success("API key saved");
  }

  function handleExport() {
    const data = {
      profiles: JSON.parse(localStorage.getItem("the-yard-profiles") || "[]"),
      gyms: JSON.parse(localStorage.getItem("the-yard-gyms") || "[]"),
      workouts: JSON.parse(localStorage.getItem("the-yard-workout-history") || "[]"),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `the-yard-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.profiles) localStorage.setItem("the-yard-profiles", JSON.stringify(data.profiles));
        if (data.gyms) localStorage.setItem("the-yard-gyms", JSON.stringify(data.gyms));
        if (data.workouts) localStorage.setItem("the-yard-workout-history", JSON.stringify(data.workouts));
        toast.success("Data imported. Refresh to see changes.");
      } catch {
        toast.error("Invalid import file");
      }
    };
    input.click();
  }

  function handleClearData() {
    localStorage.removeItem("the-yard-profiles");
    localStorage.removeItem("the-yard-gyms");
    localStorage.removeItem("the-yard-workout-history");
    localStorage.removeItem("the-yard-active-profile");
    localStorage.removeItem("the-yard-active-gym");
    toast.success("All data cleared. Refresh to reset.");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your preferences and data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-ant-..."
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button onClick={handleSaveKey}>Save</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your API key is stored locally in your browser and never sent to our servers.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {workouts.length} workouts saved locally.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Export Data
            </Button>
            <Button variant="outline" onClick={handleImport}>
              <Upload className="mr-2 h-4 w-4" /> Import Data
            </Button>
          </div>
          <Separator />
          <Button variant="destructive" onClick={handleClearData}>
            <Trash2 className="mr-2 h-4 w-4" /> Clear All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
