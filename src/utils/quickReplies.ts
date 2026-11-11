export const QUICK_REPLY_MAX = 50;
export const QUICK_REPLY_TITLE_MAX = 60;
export const QUICK_REPLY_BODY_MAX = 1000;

export const QUICK_REPLY_CATEGORIES = [
  { value: 'download_help', label: 'Download help' },
  { value: 'order_status',  label: 'Order status' },
  { value: 'refund_policy', label: 'Refund policy' },
  { value: 'course_access', label: 'Course access' },
  { value: 'general',       label: 'General' },
] as const;

export type QuickReplyCategory = (typeof QUICK_REPLY_CATEGORIES)[number]['value'];

export const QUICK_REPLY_VARIABLES = ['{buyer_name}', '{store_name}'] as const;

/** Replaces {buyer_name} / {store_name}; unknown {variables} and empty values stay exactly as typed (mirrors the API util). */
export function applyQuickReplyVars(body: string, vars: { buyer_name?: string; store_name?: string }): string {
  return String(body ?? '').replace(/\{(buyer_name|store_name)\}/g, (m, k: 'buyer_name' | 'store_name') => {
    const v = vars[k];
    return typeof v === 'string' && v.trim() ? v.trim() : m;
  });
}

/** The "/" shortcut only counts when the message STARTS with "/" and is still a single word: "/refu" yes, "/a b" no, "hi /x" no. */
export function slashQuery(text: string): string | null {
  if (!text.startsWith('/')) return null;
  const q = text.slice(1);
  return /\s/.test(q) ? null : q;
}

export function filterQuickReplies<T extends { title: string; body: string }>(list: T[], q: string): T[] {
  const s = q.trim().toLowerCase();
  if (!s) return list;
  return list.filter(r => r.title.toLowerCase().includes(s) || r.body.toLowerCase().includes(s));
}
