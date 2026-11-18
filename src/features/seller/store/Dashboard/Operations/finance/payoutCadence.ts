// How a payout schedule is described to a seller. ONE place, so no screen says "monthly" for a store on another schedule.
// (`semimonthly` = the 1st and 15th of every month; the seller picks it, existing stores stay on what they have.)
export type PayoutFrequencyValue = 'daily' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'manual';

const NOUN: Record<string, string> = {
  daily: 'daily', weekly: 'weekly', biweekly: 'every 2 weeks', semimonthly: 'twice a month (1st and 15th)', monthly: 'monthly', manual: 'on request',
};

/** "monthly", "twice a month (1st and 15th)"... Unknown / missing = monthly (the platform default). */
export function payoutCadence(freq?: string | null): string {
  return NOUN[freq ?? ''] ?? NOUN.monthly;
}

/** "Payouts are monthly." / "Payouts are twice a month (1st and 15th)." */
export function payoutsAreText(freq?: string | null): string {
  return freq === 'manual' ? 'Payouts are made on request.' : `Payouts are ${payoutCadence(freq)}.`;
}

/** Seller-selectable options (the platform default stays monthly; nothing moves unless the seller picks). */
export const PAYOUT_CHOICES: { value: 'monthly' | 'semimonthly'; label: string; hint: string }[] = [
  { value: 'monthly', label: 'Once a month', hint: 'On the 1st of every month.' },
  { value: 'semimonthly', label: 'Twice a month', hint: 'On the 1st and the 15th of every month.' },
];
