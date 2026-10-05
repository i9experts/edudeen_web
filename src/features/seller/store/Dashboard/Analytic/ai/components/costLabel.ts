/** " (N credits)" suffix for a tool's action button — empty until the live
 *  per-tool cost (credits.toolCosts) has loaded, so no hardcoded price shows. */
export function costLabel(cost: number | undefined): string {
  if (cost == null) return '';
  return ` (${cost} credit${cost === 1 ? '' : 's'})`;
}
