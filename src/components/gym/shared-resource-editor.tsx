"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Equipment, SharedResourceGroup, ResourceConstraint } from "@/types/gym";
import { ResourceSuggestion } from "@/lib/equipment/registry";
import { X, Plus, Lightbulb } from "lucide-react";

const constraintLabels: Record<ResourceConstraint, string> = {
  never_together: "Never Together",
  no_superset: "No Superset",
  group_together: "Group Together",
  needs_setup_change: "Needs Setup Change",
};

const constraintDescriptions: Record<ResourceConstraint, string> = {
  never_together: "Only use one of these per workout",
  no_superset: "Never pair in supersets or circuits",
  group_together: "Schedule back-to-back to minimize setup changes",
  needs_setup_change: "Can follow each other but transitions are slow",
};

interface SharedResourceEditorProps {
  gymId: string;
  equipment: Equipment[];
  sharedResources: SharedResourceGroup[];
  suggestions: ResourceSuggestion[];
  onAdd: (data: { resource_name: string; equipment_ids: string[]; constraint: ResourceConstraint; notes?: string }) => void;
  onRemove: (resourceId: string) => void;
}

export function SharedResourceEditor({
  gymId,
  equipment,
  sharedResources,
  suggestions,
  onAdd,
  onRemove,
}: SharedResourceEditorProps) {
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [constraint, setConstraint] = useState<ResourceConstraint>("no_superset");
  const [notes, setNotes] = useState("");
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  function getEquipmentName(id: string) {
    return equipment.find((e) => e.id === id)?.name || id;
  }

  function handleAdd() {
    if (!name.trim() || selectedIds.length < 2) return;
    onAdd({
      resource_name: name.trim(),
      equipment_ids: selectedIds,
      constraint,
      notes: notes.trim() || undefined,
    });
    setName("");
    setSelectedIds([]);
    setConstraint("no_superset");
    setNotes("");
  }

  function handleApplySuggestion(suggestion: ResourceSuggestion) {
    const matchingEquipment = equipment.filter((e) =>
      suggestion.equipment_slugs.includes(e.slug)
    );
    if (matchingEquipment.length < 2) return;
    onAdd({
      resource_name: suggestion.resource_name,
      equipment_ids: matchingEquipment.map((e) => e.id),
      constraint: suggestion.constraint,
      notes: suggestion.reason,
    });
    setDismissedSuggestions((prev) => new Set([...prev, suggestion.resource_name]));
  }

  // Filter suggestions: not dismissed, not already covered by existing resources
  const existingResourceNames = new Set(sharedResources.map((sr) => sr.resource_name));
  const activeSuggestions = suggestions.filter(
    (s) => !dismissedSuggestions.has(s.resource_name) && !existingResourceNames.has(s.resource_name)
  );

  if (equipment.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shared Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add at least 2 pieces of equipment to define shared resources.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shared Resources</CardTitle>
        <p className="text-xs text-muted-foreground">
          Group equipment that shares physical resources (barbell, floor space, etc.)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto-suggestions */}
        {activeSuggestions.length > 0 && (
          <div className="border border-dashed border-foreground/20 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
              <Lightbulb className="h-3 w-3" />
              Suggested Groups
            </div>
            {activeSuggestions.map((suggestion) => (
              <div
                key={suggestion.resource_name}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium">{suggestion.resource_name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {suggestion.reason}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApplySuggestion(suggestion)}
                  >
                    Add
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() =>
                      setDismissedSuggestions((prev) => new Set([...prev, suggestion.resource_name]))
                    }
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Existing shared resources */}
        {sharedResources.length > 0 && (
          <div className="space-y-2">
            {sharedResources.map((resource) => (
              <div
                key={resource.id}
                className="flex items-start justify-between p-2 border border-border"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{resource.resource_name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {constraintLabels[resource.constraint]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {resource.equipment_ids.map((id) => (
                      <Badge key={id} variant="outline" className="text-[10px]">
                        {getEquipmentName(id)}
                      </Badge>
                    ))}
                  </div>
                  {resource.notes && (
                    <p className="text-xs text-muted-foreground">{resource.notes}</p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => onRemove(resource.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        <div className="space-y-3 border-t border-border pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Resource Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Barbell Station"
              />
            </div>
            <div className="space-y-1">
              <Label>Constraint</Label>
              <Select value={constraint} onValueChange={(v) => setConstraint(v as ResourceConstraint)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(constraintLabels) as ResourceConstraint[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      <div>
                        <div>{constraintLabels[key]}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {constraintDescriptions[key]}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Equipment (select 2+)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-40 overflow-y-auto border border-border p-2">
              {equipment.map((eq) => (
                <label key={eq.id} className="flex items-center gap-2 cursor-pointer text-sm p-1">
                  <Checkbox
                    checked={selectedIds.includes(eq.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedIds((prev) => [...prev, eq.id]);
                      } else {
                        setSelectedIds((prev) => prev.filter((id) => id !== eq.id));
                      }
                    }}
                  />
                  <span className="truncate">{eq.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Only one barbell available"
            />
          </div>

          <Button
            onClick={handleAdd}
            disabled={!name.trim() || selectedIds.length < 2}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Shared Resource
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
