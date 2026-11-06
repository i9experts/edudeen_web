import { Link } from 'react-router-dom';
import { Eye, Percent, Lock } from 'lucide-react';
import { MetricCard } from '@/components/comman/ui';
import { useSellerAnalyticsVisits } from '@/hooks/seller/useSellerAnalytics';
import type { SellerAnalyticsParams, SellerVisitsData } from '@/api/services/analytics/analytics';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { formatNumber, formatPercent, formatDate } from '@/components/comman/analytics/format';

const SOURCE_LABEL: Record<string, string> = {
  edudeen_search: 'Edudeen search',
  category: 'Category pages',
  direct: 'Direct or inside Edudeen',
  social: 'Social media',
  external: 'Other websites',
};

const INFO = {
  visits: 'People who opened your store or any of its products, counted once per person every 30 minutes. Bots are not counted.',
  conversion: 'Paid orders (free claims and cancelled orders excluded) divided by visits, for the same dates. Only orders from the day we started counting visits are used.',
};

interface Props {
  params: SellerAnalyticsParams;
  storeId: string;
}

/** Visits + conversion for one store (free), plus where visitors came from and what they searched (Advanced analytics plans). */
export function SellerVisitsCard({ params, storeId }: Props) {
  const q = useSellerAnalyticsVisits({ ...params, storeId });

  if (q.error) return <AnalyticsErrorState message={q.error} onRetry={() => { void q.refetch(); }} />;

  const d = q.data;
  if (q.loading || !d) {
    return (
      <div className="grid grid-cols-2 gap-3" aria-busy="true">
        <MetricCard label="" value="" loading />
        <MetricCard label="" value="" loading />
      </div>
    );
  }

  if (!d.trackingSince) {
    return (
      <div className="flex items-start gap-3 bg-white border border-bone rounded-[10px] px-4 py-4">
        <Eye size={20} className="text-slate shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-carbon">Store visits</p>
          <p className="text-[13px] text-slate">Data starts collecting from today.</p>
        </div>
      </div>
    );
  }

  const startedLate = d.trackingSince > d.range.from; // range begins before we started counting
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Store visits"
          info={INFO.visits}
          value={formatNumber(d.visits)}
          icon={<Eye size={16} />}
          sub={startedLate ? `Counted since ${formatDate(d.trackingSince, 'Asia/Karachi')}` : 'Store and product pages'}
        />
        <MetricCard
          label="Conversion rate"
          info={INFO.conversion}
          value={d.conversionRate == null ? '—' : formatPercent(d.conversionRate)}
          icon={<Percent size={16} />}
          sub={d.conversionRate == null ? 'No visits in this period' : `${formatNumber(d.paidOrders)} paid orders`}
        />
      </div>
      <ProSection d={d} storeId={storeId} />
    </div>
  );
}

function ProSection({ d, storeId }: { d: SellerVisitsData; storeId: string }) {
  if (!d.pro.allowed) {
    return (
      <div className="flex items-center gap-3 bg-white border border-bone rounded-[10px] px-4 py-3">
        <Lock size={16} className="text-brand-orange shrink-0" aria-hidden />
        <p className="text-[13px] text-slate flex-1 min-w-0">See where visitors come from and what they searched for.</p>
        <Link to={`/store/${storeId}/plan-billing`} className="text-[13px] font-semibold text-brand-royal hover:underline shrink-0">See plans</Link>
      </div>
    );
  }
  const sources = d.pro.sources ?? [];
  const terms = d.pro.terms ?? [];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="bg-white border border-bone rounded-[10px] px-4 py-4">
        <p className="text-[14px] font-bold text-carbon mb-3">Where visitors came from</p>
        {d.visits === 0 ? (
          <p className="text-[13px] text-slate">No visits in this period.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {sources.map(s => (
              <li key={s.source}>
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="text-carbon truncate">{SOURCE_LABEL[s.source] ?? s.source}</span>
                  <span className="text-slate num shrink-0">{formatNumber(s.visits)} · {formatPercent(s.percent)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-bone/70 mt-1 overflow-hidden">
                  <div className="h-full rounded-full bg-brand-royal" style={{ width: `${Math.max(s.visits > 0 ? 2 : 0, s.percent)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="bg-white border border-bone rounded-[10px] px-4 py-4">
        <p className="text-[14px] font-bold text-carbon mb-3">Top search words</p>
        {terms.length === 0 ? (
          <p className="text-[13px] text-slate">No searches led to your store in this period.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {terms.map(t => (
              <li key={t.term} className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="text-carbon truncate" translate="no">{t.term}</span>
                <span className="text-slate num shrink-0">{formatNumber(t.visits)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
