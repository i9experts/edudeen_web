import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button, SkeletonBox } from '@/components/comman/ui';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { formatPrice } from '@/utils/formatPrice';
import { apiGetPromotionStats, type PromotionStatRow, type PromotionStatsRange } from '@/api/services/marketing';

interface Ctx {
  range: PromotionStatsRange;
  setRange: (r: PromotionStatsRange) => void;
  rows: Map<string, PromotionStatRow>;
  currency: string;
  loading: boolean;
  error: string;
  retry: () => void;
}
const StatsCtx = createContext<Ctx | null>(null);

/** ONE request for the whole Marketing page; every coupon / discount / sale card reads from it. */
export function PromotionStatsProvider({ storeId, children }: { storeId: string; children: ReactNode }) {
  const [range, setRange] = useState<PromotionStatsRange>('30d');
  const [rows, setRows] = useState<Map<string, PromotionStatRow>>(new Map());
  const [currency, setCurrency] = useState('PKR');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback((quiet = false) => {
    if (!storeId) return;
    if (!quiet) { setLoading(true); setError(''); }
    apiGetPromotionStats(storeId, range)
      .then(res => {
        setRows(new Map(res.data.items.map(r => [`${r.kind}:${r.id}`, r])));
        setCurrency(res.data.currency);
        setError('');
      })
      .catch(err => { if (!quiet) setError(err instanceof Error ? err.message : 'Could not load results.'); })
      .finally(() => { if (!quiet) setLoading(false); });
  }, [storeId, range]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['orders', 'marketing', 'promotions'], () => load(true), !!storeId);

  const value = useMemo<Ctx>(() => ({ range, setRange, rows, currency, loading, error, retry: () => load() }),
    [range, rows, currency, loading, error, load]);
  return <StatsCtx.Provider value={value}>{children}</StatsCtx.Provider>;
}

const RANGES: { id: PromotionStatsRange; label: string }[] = [
  { id: '7d', label: '7 days' }, { id: '30d', label: '30 days' }, { id: '90d', label: '90 days' },
];

/** Range switch shown once above the cards. */
export function PromotionStatsRangeBar() {
  const ctx = useContext(StatsCtx);
  if (!ctx) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Results period">
      <span className="text-[12.5px] text-slate">Results for the last</span>
      {RANGES.map(r => (
        <button
          key={r.id}
          type="button"
          aria-pressed={ctx.range === r.id}
          onClick={() => ctx.setRange(r.id)}
          className={`min-h-11 px-3 rounded-[7px] text-xs font-semibold border cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 ${
            ctx.range === r.id ? 'bg-carbon text-white border-carbon' : 'bg-white text-graphite border-bone hover:bg-cream'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

/** Results strip inside one card. */
export function PromotionStatsRow({ kind, id }: { kind: 'coupon' | 'discount' | 'sale'; id: string }) {
  const ctx = useContext(StatsCtx);
  if (!ctx) return null;
  const box = 'mt-3 pt-3 border-t border-[#F0EEE6]';
  if (ctx.loading) {
    return <div className={box}><SkeletonBox width="100%" height={38} rounded="6px" /></div>;
  }
  if (ctx.error) {
    return (
      <div className={`${box} flex flex-wrap items-center gap-2`}>
        <p className="text-[12px] text-error">Results unavailable.</p>
        <Button variant="ghost" size="sm" onClick={ctx.retry}>Retry</Button>
      </div>
    );
  }
  const r = ctx.rows.get(`${kind}:${id}`);
  if (!r || r.orders === 0) {
    return <div className={box}><p className="text-[12px] text-slate">No orders yet</p></div>;
  }
  const cells: [string, string][] = [
    ['Uses', String(r.uses)],
    ['Orders', String(r.orders)],
    ['Discount', formatPrice(r.discount, ctx.currency)],
    ['Revenue', formatPrice(r.revenue, ctx.currency)],
  ];
  return (
    <dl className={`${box} grid grid-cols-2 min-[420px]:grid-cols-4 gap-x-3 gap-y-2`}>
      {cells.map(([label, val]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[11.5px] text-slate">{label}</dt>
          <dd className="text-[13px] font-semibold text-carbon truncate" title={val}>{val}</dd>
        </div>
      ))}
    </dl>
  );
}
