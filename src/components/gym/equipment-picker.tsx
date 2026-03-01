"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { equipmentRegistry, equipmentCategories } from "@/lib/equipment/registry";
import { Equipment } from "@/types/gym";
import { Minus, Plus } from "lucide-react";

interface EquipmentPickerProps {
  gymId: string;
  currentEquipment: Equipment[];
  onAdd: (slug: string, name: string, category: string) => void;
  onRemove: (equipmentId: string) => void;
  onUpdateQuantity?: (equipmentId: string, quantity: number) => void;
}

export function EquipmentPicker({
  currentEquipment,
  onAdd,
  onRemove,
  onUpdateQuantity,
}: EquipmentPickerProps) {
  const currentSlugs = new Set(currentEquipment.map((e) => e.slug));
  const equipmentBySlug = new Map(currentEquipment.map((e) => [e.slug, e]));

  return (
    <div className="space-y-4">
      {equipmentCategories.map((category) => {
        const items = equipmentRegistry.filter((e) => e.category === category.value);
        return (
          <Card key={category.value}>
            <CardHeader className="pb-3">
              <CardTitle>{category.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map((item) => {
                  const isSelected = currentSlugs.has(item.slug);
                  const eq = equipmentBySlug.get(item.slug);
                  return (
                    <div
                      key={item.slug}
                      className={`flex items-center justify-between p-2 border transition-colors ${
                        isSelected
                          ? "border-foreground bg-foreground/5"
                          : "border-transparent hover:bg-accent"
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              onAdd(item.slug, item.name, item.category);
                            } else {
                              if (eq) onRemove(eq.id);
                            }
                          }}
                        />
                        <span className="text-sm truncate">{item.name}</span>
                      </label>
                      {isSelected && eq && onUpdateQuantity && (
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => onUpdateQuantity(eq.id, (eq.quantity || 1) - 1)}
                            disabled={(eq.quantity || 1) <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-xs font-mono w-4 text-center">
                            {eq.quantity || 1}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => onUpdateQuantity(eq.id, (eq.quantity || 1) + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
