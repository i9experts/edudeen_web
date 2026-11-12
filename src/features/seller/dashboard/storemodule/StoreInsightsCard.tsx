import { useCallback, useEffect, useState } from 'react';
import { Eye, UserPlus, MousePointerClick } from 'lucide-react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { apiStorePageInsights, type StorePageInsights } from '@/api/services/analytics/analytics';

const ROW_LABEL = { featured: 'Featured', newArrivals: 'New arrivals', bestSellers: 'Best sellers' } as const;
const nf = new Intl.NumberFormat('en');

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-bone bg-white p-3.5 min-w-0">
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-slate m-0">{icon}{label}</p>
      <p className="text-[22px] font-bold text-carbon leading-tight mt-1 mb-0 num">{value}</p>
      {sub && <p className="text-[12px] text-slate mt-0.5 mb-0">{sub}</p>}
    </div>
  );
}

/** Customize Store: how the store page is doing over the last 7 / 30 days. Free for every plan (same visit data as Analytics). */
export function StoreInsightsCard({ storeId }: { storeId: string }) {
  const [days, setDays] = useState<7 | 30>(7);
  const [data, setData] = useState<StorePageInsights | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback((quiet = false) => {
    if (!quiet) { setData(null); setError(false); }
    apiStorePageInsights(storeId, days)
      .then(res => { setData(res.data); setError(false); })
      .catch(() => { if (!quiet) setError(true); });
  }, [storeId, days]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['store', 'storefront'], () => load(true));

  const noVisits = !!data && data.visits === 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div role="group" aria-label="Period" className="inline-flex rounded-lg border border-bone overflow-hidden">
          {([7, 30] as const).map(d => (
            <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}
              className={`px-3 min-h-[36px] text-[13px] font-semibold border-0 cursor-pointer ${days === d ? 'bg-brand-royal text-white' : 'bg-white text-charcoal hover:bg-cream'}`}>
              {d} days
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-[13px] text-slate">
          Could not load insights. <button type="button" onClick={() => load()} className="font-semibold text-brand-royal underline bg-transparent border-0 cursor-pointer p-0">Try again</button>
        </p>
      ) : !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-busy="true" aria-label="Loading insights">
          {[0, 1, 2].map(i => <div key={i} className="h-[88px] rounded-xl bg-mist animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat icon={<Eye size={14} aria-hidden />} label="Store visits" value={noVisits ? '—' : nf.format(data.visits)} sub={noVisits ? 'No visits yet' : 'Once per person every 30 minutes'} />
            <Stat icon={<UserPlus size={14} aria-hidden />} label="New followers" value={nf.format(data.newFollowers)} sub={data.newFollowers === 0 ? 'None in this period' : 'Still following today'} />
            <Stat icon={<MousePointerClick size={14} aria-hidden />} label="Clicks on highlights" value={nf.format(data.highlightClicks.total)}
              sub={data.highlightClicks.total === 0 ? 'No clicks yet' : (Object.keys(ROW_LABEL) as (keyof typeof ROW_LABEL)[]).filter(k => data.highlightClicks.byRow[k] > 0).map(k => `${ROW_LABEL[k]} ${data.highlightClicks.byRow[k]}`).join(' · ')} />
          </div>
          {data.trackingSince && data.trackingSince > data.range.from && (
            <p className="text-[12px] text-slate mt-2 mb-0">Visits and clicks are counted from {data.trackingSince}.</p>
          )}
        </>
      )}
    </div>
  );
}
