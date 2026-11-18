// Pure helpers for the Plan & Billing usage meters (no React, tested by scripts/test-plan-usage.mjs).

/** Plan allowance for "Active promotions": a real number from entitlements, else Unlimited (-1). Never undefined / NaN. */
export function promotionLimit(limit: unknown): number {
  return typeof limit === 'number' && Number.isFinite(limit) && limit >= 0 ? limit : -1;
}

/** `used / limit` or `used · Unlimited` text for the promotions meter (UsageBar prints the same shape). */
export function promotionUsageText(used: unknown, limit: unknown): string {
  const u = typeof used === 'number' && Number.isFinite(used) && used >= 0 ? used : 0;
  const l = promotionLimit(limit);
  return l === -1 ? `${u} · Unlimited` : `${u} / ${l}`;
}

/** AI plan rows are shown as "Coming soon" while the platform AI is not configured. */
export const AI_COMING_SOON = 'Coming soon';
export const isAiBullet = (text: string) => /\bAI\b/i.test(text);
