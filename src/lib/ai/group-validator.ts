import type { Equipment, SharedResourceGroup } from "@/types/gym";
import type { GroupWorkoutOutput } from "@/lib/ai/schemas";

export interface GroupValidationContext {
  equipment: Equipment[];
  sharedResources: SharedResourceGroup[];
  groupSize: number;
  bodyweight?: boolean;
}

export interface GroupValidationResult {
  valid: boolean;
  violations: string[];
}

function itemLabel(id: string, byId: Map<string, Equipment>): string {
  const eq = byId.get(id);
  return eq ? `${eq.name} (id: ${id})` : `unknown item (id: ${id})`;
}

function personList(persons: Iterable<number>): string {
  return [...persons]
    .sort((a, b) => a - b)
    .map((p) => `person ${p}`)
    .join(", ");
}

function limitFor(eq: Equipment): number {
  return Number.isFinite(eq.quantity) && eq.quantity >= 0 ? eq.quantity : 1;
}

/**
 * Deterministically checks a group schedule. Blocks and slots are numbered from 1
 * and people from 0 in violation strings (matching the person index in the schema),
 * because the strings are fed back to the model.
 */
export function validateGroupWorkout(
  output: GroupWorkoutOutput,
  ctx: GroupValidationContext
): GroupValidationResult {
  const violations: string[] = [];
  const { groupSize, bodyweight } = ctx;
  const byId = new Map(ctx.equipment.map((e) => [e.id, e]));

  const neverTogether = ctx.sharedResources.filter((g) => g.constraint === "never_together");
  const exclusiveSlot = ctx.sharedResources.filter(
    (g) => g.constraint === "no_superset" || g.constraint === "needs_setup_change"
  );

  // never_together group -> equipment ids of that group used anywhere, and where first seen
  const neverTogetherUsed = new Map<string, Map<string, string>>();
  for (const g of neverTogether) neverTogetherUsed.set(g.id, new Map());

  if (output.blocks.length === 0) {
    violations.push("The workout has no blocks. Provide at least one block with at least one slot.");
  }

  output.blocks.forEach((block, bi) => {
    const blockLabel = `Block ${bi + 1} ("${block.name}")`;

    if (block.slots.length === 0) {
      violations.push(`${blockLabel} has no slots. Every block needs at least one slot.`);
    }

    block.slots.forEach((slot, si) => {
      const where = `${blockLabel}, slot ${si + 1}`;

      // Person coverage: each of 0..N-1 exactly once
      const counts = new Map<number, number>();
      for (const a of slot.assignments) {
        counts.set(a.person, (counts.get(a.person) ?? 0) + 1);
      }
      for (const person of counts.keys()) {
        if (!Number.isInteger(person) || person < 0 || person >= groupSize) {
          violations.push(
            `${where}: invalid person index ${person}. Valid indexes are 0 to ${groupSize - 1}.`
          );
        }
      }
      for (let p = 0; p < groupSize; p++) {
        const n = counts.get(p) ?? 0;
        if (n === 0) {
          violations.push(`${where}: person ${p} has no assignment. Every person must train in every slot.`);
        } else if (n > 1) {
          violations.push(
            `${where}: person ${p} has ${n} assignments. Each person must have exactly one assignment per slot.`
          );
        }
      }

      // Equipment usage: persons using each item (each person counted once per item)
      const usersByItem = new Map<string, Set<number>>();
      for (const a of slot.assignments) {
        const ids = new Set(a.equipment_ids);

        if (bodyweight) {
          if (ids.size > 0) {
            violations.push(
              `${where}: person ${a.person} ("${a.name}") lists equipment [${[...ids].join(", ")}] but this is a bodyweight-only workout. equipment_ids must be empty.`
            );
          }
          continue;
        }

        for (const id of ids) {
          if (!byId.has(id)) {
            violations.push(
              `${where}: person ${a.person} ("${a.name}") references unknown equipment id "${id}". Use only exact IDs from the equipment list.`
            );
            continue;
          }
          if (!usersByItem.has(id)) usersByItem.set(id, new Set());
          usersByItem.get(id)!.add(a.person);
        }
      }

      for (const [id, users] of usersByItem) {
        const limit = limitFor(byId.get(id)!);
        if (users.size > limit) {
          violations.push(
            `${where}: ${itemLabel(id, byId)} is used by ${users.size} people at once (${personList(users)}) but only ${limit} available.`
          );
        }
      }

      // no_superset / needs_setup_change: at most one person on the whole group per slot
      for (const g of exclusiveSlot) {
        const groupIds = new Set(g.equipment_ids);
        const users = new Set<number>();
        const itemsUsed = new Set<string>();
        for (const [id, itemUsers] of usersByItem) {
          if (!groupIds.has(id)) continue;
          itemsUsed.add(id);
          for (const u of itemUsers) users.add(u);
        }
        if (users.size > 1) {
          const names = [...itemsUsed].map((id) => itemLabel(id, byId)).join(", ");
          violations.push(
            `${where}: shared resource "${g.resource_name}" (${g.constraint}) is used by ${users.size} people at the same time (${personList(users)}) via ${names}. Only one person may use equipment from this group in a slot.`
          );
        }
      }

      // never_together bookkeeping
      for (const g of neverTogether) {
        const seen = neverTogetherUsed.get(g.id)!;
        for (const id of g.equipment_ids) {
          if (usersByItem.has(id) && !seen.has(id)) seen.set(id, where);
        }
      }
    });
  });

  for (const g of neverTogether) {
    const seen = neverTogetherUsed.get(g.id)!;
    if (seen.size > 1) {
      const used = [...seen].map(([id, where]) => `${itemLabel(id, byId)} (first used at ${where})`).join("; ");
      violations.push(
        `Shared resource "${g.resource_name}" (never_together) must use only ONE item in the entire workout, but ${seen.size} are used: ${used}.`
      );
    }
  }

  return { valid: violations.length === 0, violations };
}
