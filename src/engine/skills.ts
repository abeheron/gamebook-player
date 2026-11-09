import type { SkillRank, SystemDef } from "../format/types";

/**
 * Target adjustment for a test that names a skill.
 * A test with no skill changes the target by nothing.
 * The bonus is resolved before the roll is judged.
 */
export function skillAdjustment(system: SystemDef, skills: readonly SkillRank[], skillId: string | undefined): number {
  if (skillId === undefined) return 0;
  const owned = skills.find((skill) => skill.id === skillId);
  if (!owned) return system.absentSkillPenalty;
  return owned.bonus;
}
