"use client";

import { useState } from "react";
import { useGym } from "@/hooks/use-gym";
import { EquipmentPicker } from "@/components/gym/equipment-picker";
import { ConflictEditor } from "@/components/gym/conflict-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EquipmentCategory } from "@/types/gym";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

export default function GymPage() {
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
    addConflict,
    removeConflict,
    hydrated,
  } = useGym();

  const [newGymName, setNewGymName] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");

  if (!hydrated) {
    return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-lg" /></div>;
  }

  function handleCreateGym() {
    if (!newGymName.trim()) return;
    createGym(newGymName.trim());
    setNewGymName("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gym Setup</h1>
        <p className="text-muted-foreground">
          Configure your equipment and space constraints
        </p>
      </div>

      {/* Gym list */}
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
                <Badge variant="secondary" className="ml-1">
                  {(gym.equipment || []).length}
                </Badge>
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

      {/* Equipment picker and conflict editor */}
      {activeGym ? (
        <div className="space-y-6">
          <EquipmentPicker
            gymId={activeGym.id}
            currentEquipment={activeGym.equipment || []}
            onAdd={(slug, name, category) =>
              addEquipment(activeGym.id, {
                slug,
                name,
                category: category as EquipmentCategory,
                attributes: {},
              })
            }
            onRemove={(equipmentId) => removeEquipment(activeGym.id, equipmentId)}
          />
          <ConflictEditor
            gymId={activeGym.id}
            equipment={activeGym.equipment || []}
            conflicts={activeGym.conflicts || []}
            onAdd={(a, b, reason) => addConflict(activeGym.id, { equipment_a: a, equipment_b: b, reason })}
            onRemove={(conflictId) => removeConflict(activeGym.id, conflictId)}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Create a gym to get started with equipment configuration.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
