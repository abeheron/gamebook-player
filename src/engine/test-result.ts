/** A 2d6 double 1 passes, and a double 6 fails, before the total is compared with the target. */
export function skillTestSuccess(faces: readonly number[], total: number, target: number): boolean {
  if (faces.length === 2 && faces[0] === 1 && faces[1] === 1) return true;
  if (faces.length === 2 && faces[0] === 6 && faces[1] === 6) return false;
  return total <= target;
}
