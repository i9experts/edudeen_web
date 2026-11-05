export interface StoreReturnPolicy {
  returnsAccepted: boolean;
  windowDays: number;
  /** Seller note for physical items. */
  note?: string | null;
  /** Seller note for digital downloads (text only; the real rule is refund only before download). */
  digitalNote?: string | null;
}

export interface StoreResponseStats {
  medianReplyMinutes: number;
  sampleSize: number;
}

/** Same minimum as the API (TRUST_MIN_SAMPLES): below this many data points a trust number is never shown. */
export const TRUST_MIN_SAMPLES = 10;

/** One trust number from the API: pct is null (and must stay hidden) when there is not enough data. */
export interface TrustMetric { pct: number | null; sample: number }

/** Cached, per-store trust numbers (public store response). */
export interface StoreTrust {
  responseRate: TrustMetric;
  dispatch: TrustMetric;
  city: string | null;
  minSamples: number;
  responseHours: number;
  dispatchHours: number;
}

/** "92%" or null when hidden. Defensive: never prints a number under the minimum even if the API sent one. */
export function trustPctLabel(m?: TrustMetric | null): string | null {
  if (!m || m.pct == null || m.sample < TRUST_MIN_SAMPLES) return null;
  return `${Math.round(m.pct)}%`;
}

/** "March 2025" — member-since label, null for a missing/invalid date. */
export function memberSinceLabel(createdAt?: string | null): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Bucketed wording for the seller's real median reply time; null = not enough data, show nothing. */
export function responseTimeLabel(stats?: StoreResponseStats | null): string | null {
  if (!stats || stats.sampleSize < TRUST_MIN_SAMPLES || !(stats.medianReplyMinutes >= 0)) return null;
  const m = stats.medianReplyMinutes;
  if (m <= 60) return 'Usually replies within 1 hour';
  if (m <= 360) return 'Usually replies within a few hours';
  if (m <= 1440) return 'Usually replies within 1 day';
  if (m <= 2880) return 'Usually replies within 2 days';
  return 'Usually replies in 2+ days';
}

export interface ReturnSummary {
  line: string;
  detail: string[];
}

/**
 * One-line returns summary for a product page. The platform rules (digital refund only before download;
 * physical items only after delivery) are real; the window and acceptance come from the seller's own
 * stated policy and are not enforced by the request API, so the wording says "seller policy".
 */
export function returnSummary(policy: StoreReturnPolicy | null | undefined, isDigital: boolean): ReturnSummary {
  const note = policy?.note?.trim();
  if (isDigital) {
    return {
      line: 'No returns on digital downloads',
      detail: [
        'Digital items can be refunded only if you have not downloaded the file yet.',
        'If a file is broken or not as described, contact the seller or Edudeen support.',
        ...(note ? [`Seller note: ${note}`] : []),
      ],
    };
  }
  if (!policy) {
    return {
      line: 'Returns reviewed by the seller',
      detail: [
        'You can request a return or refund once your order is delivered.',
        'The seller reviews each request.',
      ],
    };
  }
  if (!policy.returnsAccepted) {
    return {
      line: 'No returns accepted by this seller',
      detail: [
        'This is the seller\'s stated policy.',
        ...(note ? [`Seller note: ${note}`] : []),
        'If an item arrives damaged or wrong, contact the seller or Edudeen support.',
      ],
    };
  }
  return {
    line: `Returns within ${policy.windowDays} day${policy.windowDays === 1 ? '' : 's'}`,
    detail: [
      `Seller policy: return requests accepted for ${policy.windowDays} day${policy.windowDays === 1 ? '' : 's'} after delivery.`,
      'Request a return from your order page once the item is delivered; the seller reviews each request.',
      ...(note ? [`Seller note: ${note}`] : []),
    ],
  };
}
