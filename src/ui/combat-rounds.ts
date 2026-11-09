export type RoundMark = "held" | "wound" | "now" | "later";

export function roundMarks(successes: readonly boolean[], total: number, settled: boolean): RoundMark[] {
  return Array.from({ length: total }, (_, index) => {
    if (index < successes.length) return successes[index] ? "held" : "wound";
    if (!settled && index === successes.length) return "now";
    return "later";
  });
}

export function roundName(round: number, mark: RoundMark): string {
  return `Round ${round}: ${mark}`;
}

function woundsText(count: number): string {
  return count === 1 ? "1 wound" : `${count} wounds`;
}

/** Plain-language line under the round cards. */
export function roundSummary(resolved: number, total: number, wounds: number, settled: boolean, vitality: number): string {
  if (vitality <= 0) return "Vitality 0 · fight ends";
  if (settled) return `${resolved} of ${total} rounds finished · ${woundsText(wounds)}`;
  const current = Math.min(total, resolved + 1);
  return `Round ${current} of ${total} · ${woundsText(wounds)} taken`;
}
