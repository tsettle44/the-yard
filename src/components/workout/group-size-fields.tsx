"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_GROUP_SIZE, MAX_GROUP_SIZE } from "@/lib/ai/schemas";

interface GroupSizeFieldsProps {
  groupSize: number;
  onGroupSizeChange: (size: number) => void;
  names: string[];
  onNamesChange: (names: string[]) => void;
}

const sizes = Array.from({ length: MAX_GROUP_SIZE - MIN_GROUP_SIZE + 1 }, (_, i) => MIN_GROUP_SIZE + i);

export function GroupSizeFields({ groupSize, onGroupSizeChange, names, onNamesChange }: GroupSizeFieldsProps) {
  function setName(index: number, value: string) {
    const next = [...names];
    while (next.length <= index) next.push("");
    next[index] = value;
    onNamesChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>People</Label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Number of people">
          {sizes.map((n) => (
            <Button
              key={n}
              type="button"
              size="sm"
              variant={groupSize === n ? "default" : "outline"}
              aria-pressed={groupSize === n}
              onClick={() => onGroupSizeChange(n)}
              className="min-w-[2.5rem]"
            >
              {n}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Everyone trains at the same time with no equipment conflicts.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Names (optional)</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Array.from({ length: groupSize }, (_, i) => (
            <Input
              key={i}
              value={names[i] ?? ""}
              onChange={(e) => setName(i, e.target.value)}
              placeholder={`Person ${i + 1}`}
              aria-label={`Name for person ${i + 1}`}
              maxLength={40}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
