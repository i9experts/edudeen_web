export type AnalyticsGranularity = 'day' | 'week' | 'month';

export function formatCurrency(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

export function formatPercent(n: number | null | undefined, opts?: { signed?: boolean }): string {
  if (n == null || Number.isNaN(n)) return '—';
  const sign = opts?.signed && n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1).replace(/\.0$/, '')}%`;
}

export function formatBucketLabel(dateStr: string, granularity: AnalyticsGranularity): string {
  const d = new Date(dateStr);
  if (granularity === 'month') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
