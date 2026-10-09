// ─── Shared Chart Theme ─────────────────────────────────────────────────────
// Single source of truth for the recharts wrappers in this folder — sourced
// from the app's real design tokens (src/constants/tokens.ts) so charts stay
// visually in sync with the rest of the UI instead of hardcoding their own
// palettes.

import { COLORS } from '@/constants/tokens';

/** Font family used for axis ticks / legends across all charts. */
export const CHART_FONT = "Arial, Helvetica, sans-serif";

/** Shared axis tick style (XAxis / YAxis / Legend text). */
export const CHART_TICK = { fontSize: 12, fill: COLORS.slate, fontFamily: CHART_FONT };

/** Shared cartesian grid style. */
export const CHART_GRID = { stroke: COLORS.bone, strokeDasharray: '4 4' };

/**
 * Ordered palette for multi-series charts (donut / funnel / multi-line).
 * Sourced from the real brand tokens rather than invented hex values.
 */
export const CHART_COLORS = [
  COLORS.orange,
  COLORS.charcoal,
  COLORS.slate,
  COLORS.success,
  COLORS.info,
  COLORS.warning,
  COLORS.deepOrange,
  COLORS.error,
];

/** Default single-series color (Bar / Area / Sparkline) when no `color` prop is passed. */
export const CHART_DEFAULT_COLOR = COLORS.orange;
