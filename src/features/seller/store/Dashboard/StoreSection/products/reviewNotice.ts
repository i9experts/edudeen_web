/** The API holds a listing for review when its text shows contact details; its response message says so. Returns it for a toast. */
export function reviewNoticeText(res: unknown): string | null {
  const m = (res as { message?: unknown } | null)?.message;
  return typeof m === 'string' && (/contact details/i.test(m) || /sent to Edudeen for review/i.test(m)) ? m : null;
}
