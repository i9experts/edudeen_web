import type { TeamPeriod } from '@/api/services/operations';

export const PERIODS: TeamPeriod[] = [7, 30, 90];
export const parsePeriod = (v: string | null): TeamPeriod => (v === '7' ? 7 : v === '90' ? 90 : 30);
/** Same targets as the server's team breaches (median reply 24 h, on-time 90%). */
export const REPLY_LIMIT_MIN = 24 * 60;
export const ON_TIME_TARGET = 90;

export const lastSeen = (iso: string | null) => {
  if (!iso) return 'Never';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  return h < 1 ? 'Within the hour' : h < 48 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
};
