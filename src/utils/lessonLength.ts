/** Lesson length is stored in minutes, with up to 2 decimals so a 29 second voice is 0.48 (not rounded up to 1 minute). */
export function minutesFromSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.max(0.01, Math.round((seconds / 60) * 100) / 100);
}

/** "29s" under a minute, "1m 30s" under 10 minutes when it is not whole, else "12m". */
export function lessonLengthLabel(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '';
  const total = Math.round(minutes * 60);
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m < 10 && s >= 5 ? `${m}m ${s}s` : `${Math.round(total / 60)}m`;
}
