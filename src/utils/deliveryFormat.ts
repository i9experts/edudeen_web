export type DeliveryFormatValue = 'download' | 'course' | 'live_class';

/** Normalises whatever the API sent (missing = a normal file download). */
export function normalizeDeliveryFormat(v: unknown): DeliveryFormatValue {
  return v === 'course' || v === 'live_class' ? v : 'download';
}

export function deliveryFormatLabel(v: unknown): string {
  const f = normalizeDeliveryFormat(v);
  return f === 'course' ? 'Online course' : f === 'live_class' ? 'Live class' : 'File download';
}

/** "12 lessons · 3.5 h" / "12 lessons · 45 min"; '' when there is nothing to say. */
export function courseSummaryText(s?: { lessonCount?: number; totalMinutes?: number } | null): string {
  if (!s || !s.lessonCount) return '';
  const n = `${s.lessonCount} ${s.lessonCount === 1 ? 'lesson' : 'lessons'}`;
  const m = s.totalMinutes || 0;
  if (!m) return n;
  return `${n} · ${m >= 90 ? `${Math.round(m / 6) / 10} h` : `${m} min`}`;
}

export const PLATFORM_LABEL: Record<string, string> = { zoom: 'Zoom', google_meet: 'Google Meet', teams: 'Microsoft Teams', other: 'Online' };
