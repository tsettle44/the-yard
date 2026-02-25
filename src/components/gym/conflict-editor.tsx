"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Equipment, EquipmentConflict } from "@/types/gym";
import { X, Plus } from "lucide-react";

interface ConflictEditorProps {
  gymId: string;
  equipment: Equipment[];
  conflicts: EquipmentConflict[];
  onAdd: (equipmentA: string, equipmentB: string, reason: string) => void;
  onRemove: (conflictId: string) => void;
}

export function ConflictEditor({
  gymId,
  equipment,
  conflicts,
  onAdd,
  onRemove,
}: ConflictEditorProps) {
  const [eqA, setEqA] = useState("");
  const [eqB, setEqB] = useState("");
  const [reason, setReason] = useState("");

  function handleAdd() {
    if (!eqA || !eqB || eqA === eqB) return;
    onAdd(eqA, eqB, reason || "Share same space/mount");
    setEqA("");
    setEqB("");
    setReason("");
  }

  function getEquipmentName(id: string) {
    return equipment.find((e) => e.id === id)?.name || id;
  }

  if (equipment.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipment Conflicts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add at least 2 pieces of equipment to define conflicts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Equipment Conflicts</CardTitle>
        <p className="text-sm text-muted-foreground">
          Mark equipment that can&apos;t be used at the same time (e.g., share the same space or mount).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {conflicts.length > 0 && (
          <div className="space-y-2">
            {conflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="flex items-center justify-between p-2 rounded-md bg-muted"
              >
                <div className="text-sm">
                  <span className="font-medium">
                    {getEquipmentName(conflict.equipment_a)}
                  </span>
                  {" <-> "}
                  <span className="font-medium">
                    {getEquipmentName(conflict.equipment_b)}
                  </span>
                  {conflict.reason && (
                    <span className="text-muted-foreground ml-2">
                      ({conflict.reason})
                    </span>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onRemove(conflict.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Equipment A</Label>
            <Select value={eqA} onValueChange={setEqA}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {equipment.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Equipment B</Label>
            <Select value={eqB} onValueChange={setEqB}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {equipment.filter((e) => e.id !== eqA).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Same mount point"
            />
          </div>
          <Button onClick={handleAdd} disabled={!eqA || !eqB || eqA === eqB}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
