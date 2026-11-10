import type { Condition, Section, SystemDef } from "../format/types";

/** Words for the values on the loaded book and system. */

export function statLabel(system: SystemDef, statId: string): string {
  return system.stats.find((stat) => stat.id === statId)?.label ?? statId;
}

export function skillClause(label: string, bonus: number): string {
  const signed = bonus > 0 ? `+${bonus}` : bonus < 0 ? `−${Math.abs(bonus)}` : "0";
  return `${label} ${signed}`;
}

export function rollFormula(
  dice: string,
  statLabelText: string,
  statValue: number,
  modifier = 0,
  skill?: { label: string; bonus: number },
): string {
  const adjustments: string[] = [];
  if (modifier !== 0) adjustments.push(modifier > 0 ? `+ ${modifier}` : `− ${Math.abs(modifier)}`);
  if (skill) adjustments.push(skill.bonus > 0 ? `+ ${skill.bonus} ${skill.label}` : `− ${Math.abs(skill.bonus)} ${skill.label}`);
  if (adjustments.length === 0) return `${dice} ≤ ${statLabelText} ${statValue}`;
  const total = statValue + modifier + (skill?.bonus ?? 0);
  return `${dice} ≤ ${statLabelText} ${statValue} ${adjustments.join(" ")} = ${total}`;
}

export function sectionTitle(sections: readonly Section[], sectionId: string): string {
  return sections.find((section) => section.id === sectionId)?.title ?? sectionId;
}

/** A pass, fail, or fight destination. The title can ellipsize; the prefix keeps the section number. */
export function sectionDestination(heading: string, sectionId: string, title: string): {
  prefix: string;
  title: string;
  name: string;
} {
  return {
    prefix: `${heading} → §${sectionId} · `,
    title,
    name: `${heading}, section ${sectionId}, ${title}`,
  };
}

export function ticksOnSection(section: Section): { id: string; label: string }[] {
  const seen = new Set<string>();
  const ticks: { id: string; label: string }[] = [];
  for (const choice of section.choices ?? []) {
    for (const effect of choice.effects ?? []) {
      if (effect.op !== "tick" || seen.has(effect.id)) continue;
      seen.add(effect.id);
      ticks.push({ id: effect.id, label: effect.label });
    }
  }
  return ticks;
}

export function blockedBecause(condition: Condition): string {
  switch (condition.op) {
    case "not":
      return condition.condition.op === "ticked" ? "That box is already ticked." : "Not available in this sample.";
    case "ticked":
      return "That box is not ticked.";
    case "hasItem":
      return "You do not have the item.";
    case "keyword":
      return "You do not have the keyword.";
    case "statAtLeast":
      return "A sample stat is too low.";
    case "all":
      return "Not every sample requirement is met.";
    default: {
      const unreachable: never = condition;
      return String(unreachable);
    }
  }
}
