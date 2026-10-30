export type DeliveryFormatValue = 'download' | 'course';

/** Normalises whatever the API sent (missing = a normal file download). */
export function normalizeDeliveryFormat(v: unknown): DeliveryFormatValue {
  return v === 'course' ? 'course' : 'download';
}

export function deliveryFormatLabel(v: unknown): string {
  const f = normalizeDeliveryFormat(v);
  return f === 'course' ? 'Online course' : 'File download';
}

/** "12 lessons · 3.5 h" / "12 lessons · 45 min"; '' when there is nothing to say. */
export function courseSummaryText(s?: { lessonCount?: number; totalMinutes?: number } | null): string {
  if (!s || !s.lessonCount) return '';
  const n = `${s.lessonCount} ${s.lessonCount === 1 ? 'lesson' : 'lessons'}`;
  const m = s.totalMinutes || 0;
  if (!m) return n;
  return `${n} · ${m >= 90 ? `${Math.round(m / 6) / 10} h` : `${m} min`}`;
}

