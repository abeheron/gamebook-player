/** Drawings bundled with the sample. A book may only name one of these. */
export const SAMPLE_ART_IDS = ["lantern", "moth"] as const;

export type SampleArtId = (typeof SAMPLE_ART_IDS)[number];

export function isSampleArtId(value: string): value is SampleArtId {
  return (SAMPLE_ART_IDS as readonly string[]).includes(value);
}
