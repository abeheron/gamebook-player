import type { Condition, Section, SystemDef } from "../format/types";

/** Sample-facing words. These describe this book's data, not the GNAT rules. */

export function statLabel(system: SystemDef, statId: string): string {
  return system.stats.find((stat) => stat.id === statId)?.label ?? statId;
}

export function rollFormula(dice: string, statLabelText: string, statValue: number, modifier = 0): string {
  if (modifier === 0) return `${dice} ≤ ${statLabelText} ${statValue}`;
  const signed = modifier > 0 ? `+ ${modifier}` : `− ${Math.abs(modifier)}`;
  return `${dice} ≤ ${statLabelText} ${statValue} ${signed} = ${statValue + modifier}`;
}

export function sectionTitle(sections: readonly Section[], sectionId: string): string {
  return sections.find((section) => section.id === sectionId)?.title ?? sectionId;
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
