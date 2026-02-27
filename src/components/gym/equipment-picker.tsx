"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { equipmentRegistry, equipmentCategories } from "@/lib/equipment/registry";
import { Equipment } from "@/types/gym";

interface EquipmentPickerProps {
  gymId: string;
  currentEquipment: Equipment[];
  onAdd: (slug: string, name: string, category: string) => void;
  onRemove: (equipmentId: string) => void;
}

export function EquipmentPicker({
  gymId,
  currentEquipment,
  onAdd,
  onRemove,
}: EquipmentPickerProps) {
  const currentSlugs = new Set(currentEquipment.map((e) => e.slug));

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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {items.map((item) => {
                  const isSelected = currentSlugs.has(item.slug);
                  return (
                    <label
                      key={item.slug}
                      className={`flex items-center gap-2 p-2 border cursor-pointer transition-colors ${
                        isSelected
                          ? "border-foreground bg-foreground/5"
                          : "border-transparent hover:bg-accent"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onAdd(item.slug, item.name, item.category);
                          } else {
                            const eq = currentEquipment.find((e) => e.slug === item.slug);
                            if (eq) onRemove(eq.id);
                          }
                        }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </label>
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
