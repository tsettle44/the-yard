import type { Equipment, SharedResourceGroup } from "@/types/gym";
import type { GroupWorkoutFormat, GroupWorkoutSchedule } from "@/types/workout";

interface ValidationOptions {
  schedule: GroupWorkoutSchedule | undefined;
  participantCount: number;
  format: GroupWorkoutFormat;
  equipment: Equipment[];
  sharedResources: SharedResourceGroup[];
  bodyweight?: boolean;
}

export interface GroupScheduleValidation {
  valid: boolean;
  errors: string[];
}

export function validateGroupSchedule({
  schedule,
  participantCount,
  format,
  equipment,
  sharedResources,
  bodyweight,
}: ValidationOptions): GroupScheduleValidation {
  const errors: string[] = [];

  if (!schedule) {
    return { valid: false, errors: ["The generated workout is missing its group schedule."] };
  }

  if (schedule.participant_count !== participantCount) {
    errors.push(`Expected ${participantCount} participants, received ${schedule.participant_count}.`);
  }
  if (schedule.format !== format) {
    errors.push(`Expected ${format} format, received ${schedule.format}.`);
  }

  const equipmentById = new Map(equipment.map((item) => [item.id, item]));
  const usedEquipment = new Set<string>();

  schedule.rounds.forEach((round, roundIndex) => {
    const participants = new Set<number>();
    const demand = new Map<string, number>();

    round.assignments.forEach((assignment) => {
      if (participants.has(assignment.participant)) {
        errors.push(`Round ${roundIndex + 1} assigns participant ${assignment.participant} more than once.`);
      }
      participants.add(assignment.participant);

      if (assignment.participant < 1 || assignment.participant > participantCount) {
        errors.push(`Round ${roundIndex + 1} has invalid participant ${assignment.participant}.`);
      }

      const assignmentEquipment = new Set(assignment.equipment_ids);
      assignmentEquipment.forEach((equipmentId) => {
        usedEquipment.add(equipmentId);
        if (bodyweight) {
          errors.push(`Round ${roundIndex + 1} uses equipment in bodyweight mode.`);
          return;
        }
        if (!equipmentById.has(equipmentId)) {
          errors.push(`Round ${roundIndex + 1} references unavailable equipment ${equipmentId}.`);
          return;
        }
        demand.set(equipmentId, (demand.get(equipmentId) || 0) + 1);
      });
    });

    for (let participant = 1; participant <= participantCount; participant += 1) {
      if (!participants.has(participant)) {
        errors.push(`Round ${roundIndex + 1} is missing participant ${participant}.`);
      }
    }
    if (round.assignments.length !== participantCount) {
      errors.push(`Round ${roundIndex + 1} must contain exactly ${participantCount} assignments.`);
    }

    demand.forEach((units, equipmentId) => {
      const available = equipmentById.get(equipmentId)?.quantity || 0;
      if (units > available) {
        errors.push(`Round ${roundIndex + 1} needs ${units} units of ${equipmentId}, but only ${available} are available.`);
      }
    });

    sharedResources
      .filter((resource) => resource.constraint === "no_superset")
      .forEach((resource) => {
        const simultaneousUsers = round.assignments.filter((assignment) =>
          assignment.equipment_ids.some((id) => resource.equipment_ids.includes(id))
        ).length;
        if (simultaneousUsers > 1) {
          errors.push(`Round ${roundIndex + 1} double-books shared resource ${resource.resource_name}.`);
        }
      });
  });

  sharedResources
    .filter((resource) => resource.constraint === "never_together")
    .forEach((resource) => {
      const usedMembers = resource.equipment_ids.filter((id) => usedEquipment.has(id));
      if (usedMembers.length > 1) {
        errors.push(`Workout uses multiple items from never-together resource ${resource.resource_name}.`);
      }
    });

  return { valid: errors.length === 0, errors };
}
