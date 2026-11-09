export type RoundMark = "held" | "wound" | "current" | "upcoming";

/** Caption for the round about to be rolled, or the round the fight ended on. */
export function roundCaption(resolved: number, total: number, settled: boolean): string {
  const shown = settled ? Math.max(1, Math.min(resolved, total)) : Math.min(total, resolved + 1);
  return `Round ${shown} of ${total}`;
}

export function roundMarks(successes: readonly boolean[], total: number, settled: boolean): RoundMark[] {
  return Array.from({ length: total }, (_, index) => {
    if (index < successes.length) return successes[index] ? "held" : "wound";
    if (!settled && index === successes.length) return "current";
    return "upcoming";
  });
}

export function roundLabel(round: number, mark: RoundMark): string {
  return `Round ${round}: ${mark}`;
}
