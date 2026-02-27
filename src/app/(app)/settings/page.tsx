"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useProfiles } from "@/hooks/use-profile";
import { useGym } from "@/hooks/use-gym";
import { useWorkouts } from "@/hooks/use-workouts";
import { EquipmentPicker } from "@/components/gym/equipment-picker";
import { SharedResourceEditor } from "@/components/gym/shared-resource-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EquipmentCategory } from "@/types/gym";
import { getApplicableSuggestions } from "@/lib/equipment/registry";
import { config } from "@/lib/config";
import { toast } from "sonner";
import { Download, Upload, Trash2, Plus, Pencil, Check, X } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { profiles } = useProfiles();
  const { workouts } = useWorkouts();

  const {
    gyms,
    activeGym,
    activeGymId,
    setActiveGymId,
    createGym,
    updateGymName,
    deleteGym,
    addEquipment,
    removeEquipment,
    updateEquipmentQuantity,
    addSharedResource,
    removeSharedResource,
    updateLayoutNotes,
    hydrated: gymHydrated,
  } = useGym();

  const [newGymName, setNewGymName] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");

  const currentEquipment = activeGym?.equipment || [];
  const suggestions = getApplicableSuggestions(currentEquipment.map((e) => e.slug));

  function handleExport() {
    // In hosted mode, export the in-memory data (already fetched from DB)
    const data = {
      profiles,
      gyms,
      workouts,
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
    if (config.isHosted) {
      toast.error("Import is not supported in hosted mode. Data is managed through your account.");
      return;
    }

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
    if (config.isHosted) {
      toast.error("Use your account settings to manage data in hosted mode.");
      return;
    }

    localStorage.removeItem("the-yard-profiles");
    localStorage.removeItem("the-yard-gyms");
    localStorage.removeItem("the-yard-workout-history");
    localStorage.removeItem("the-yard-active-profile");
    localStorage.removeItem("the-yard-active-gym");
    localStorage.removeItem("the-yard-gym-schema-version");
    toast.success("All data cleared. Refresh to reset.");
  }

  function handleCreateGym() {
    if (!newGymName.trim()) return;
    createGym(newGymName.trim());
    setNewGymName("");
  }

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="font-black text-sm uppercase tracking-[0.2em]">Settings</h1>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Manage your preferences and data</p>
      </div>

      {/* Gym Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Gym Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!gymHydrated ? (
            <div className="animate-pulse"><div className="h-32 bg-muted" /></div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 items-center">
                {gyms.map((gym) => (
                  <div key={gym.id} className="flex items-center gap-1">
                    {editingName === gym.id ? (
                      <>
                        <Input
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="h-8 w-40"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            if (editNameValue.trim()) updateGymName(gym.id, editNameValue.trim());
                            setEditingName(null);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingName(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant={activeGymId === gym.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveGymId(gym.id)}
                        className="gap-2"
                      >
                        {gym.name}
                        <span className="font-mono text-[10px] ml-1 opacity-60">
                          {(gym.equipment || []).length}
                        </span>
                      </Button>
                    )}
                    {activeGymId === gym.id && editingName !== gym.id && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => { setEditingName(gym.id); setEditNameValue(gym.name); }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => deleteGym(gym.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    value={newGymName}
                    onChange={(e) => setNewGymName(e.target.value)}
                    placeholder="New gym name..."
                    className="h-8 w-40"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateGym()}
                  />
                  <Button size="sm" variant="outline" onClick={handleCreateGym} disabled={!newGymName.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {activeGym ? (
                <div className="space-y-6">
                  <EquipmentPicker
                    gymId={activeGym.id}
                    currentEquipment={currentEquipment}
                    onAdd={(slug, name, category) =>
                      addEquipment(activeGym.id, {
                        slug,
                        name,
                        category: category as EquipmentCategory,
                        attributes: {},
                      })
                    }
                    onRemove={(equipmentId) => removeEquipment(activeGym.id, equipmentId)}
                    onUpdateQuantity={(equipmentId, quantity) =>
                      updateEquipmentQuantity(activeGym.id, equipmentId, quantity)
                    }
                  />

                  {/* Layout Notes */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Gym Layout Notes</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Describe your gym layout to help the AI plan better transitions.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={activeGym.layout_notes || ""}
                        onChange={(e) => updateLayoutNotes(activeGym.id, e.target.value)}
                        placeholder="e.g. Small garage gym, squat rack is against the wall, bench slides under the rack when not in use. Barbell stays on the rack most of the time."
                        rows={3}
                      />
                    </CardContent>
                  </Card>

                  <SharedResourceEditor
                    gymId={activeGym.id}
                    equipment={currentEquipment}
                    sharedResources={activeGym.shared_resources || []}
                    suggestions={suggestions}
                    onAdd={(data) =>
                      addSharedResource(activeGym.id, data)
                    }
                    onRemove={(resourceId) => removeSharedResource(activeGym.id, resourceId)}
                  />
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Create a gym to get started with equipment configuration.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
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
          <CardTitle>Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground font-mono">
            {workouts.length} workouts saved{config.isHosted ? "" : " locally"}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            {!config.isHosted && (
              <Button variant="outline" onClick={handleImport}>
                <Upload className="mr-2 h-4 w-4" /> Import
              </Button>
            )}
          </div>
          {!config.isHosted && (
            <>
              <Separator />
              <Button variant="destructive" onClick={handleClearData}>
                <Trash2 className="mr-2 h-4 w-4" /> Clear All Data
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
