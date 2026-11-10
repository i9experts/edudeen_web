import { Eye, Percent } from 'lucide-react';
import { MetricCard } from '@/components/comman/ui';
import { LineChart } from '@/components/comman/charts';
import { useAdminAnalyticsVisits } from '@/hooks/admin/useAdminAnalytics';
import type { BaseAnalyticsParams } from '@/api/services/analytics/adminAnalytics';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ChartCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatNumber, formatPercent, formatDate } from '@/components/comman/analytics/format';

const SOURCE_LABEL: Record<string, string> = {
  edudeen_search: 'Edudeen search',
  category: 'Category pages',
  direct: 'Direct or inside Edudeen',
  social: 'Social media',
  external: 'Other websites',
};

const INFO = {
  visits: 'Every store or product page open, counted once per visitor every 30 minutes, across all stores. Bots are not counted.',
  conversion: 'Paid orders (free claims and cancelled orders excluded) divided by visits, for the same dates. Only orders from the day we started counting visits are used.',
};

/** Platform-wide traffic: total visits/conversion, where visitors come from, the daily
 *  trend, and which stores are drawing the most traffic right now. Same data model
 *  and definitions as the seller-facing visits card — just summed across every store. */
export function VisitsTab({ params }: { params: BaseAnalyticsParams }) {
  const q = useAdminAnalyticsVisits(params);

  if (q.error) return <AnalyticsErrorState message={q.error} onRetry={() => { void q.refetch(); }} />;

  const d = q.data;
  if (q.loading || !d) return <ChartCardSkeleton height={260} />;

  if (!d.trackingSince) {
    return (
      <div className="flex items-start gap-3 bg-white border border-bone rounded-[10px] px-4 py-4">
        <Eye size={20} className="text-slate shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-carbon">Platform visits</p>
          <p className="text-[13px] text-slate">Data starts collecting from today.</p>
        </div>
      </div>
    );
  }

  const startedLate = d.trackingSince > d.range.from;
  const topStoreVisits = Math.max(1, d.topStores[0]?.visits ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricCard
          label="Total visits"
          info={INFO.visits}
          value={formatNumber(d.visits)}
          icon={<Eye size={16} />}
          sub={startedLate ? `Counted since ${formatDate(d.trackingSince, 'Asia/Karachi')}` : 'Every store, across all pages'}
        />
        <MetricCard
          label="Conversion rate"
          info={INFO.conversion}
          value={d.conversionRate == null ? '—' : formatPercent(d.conversionRate)}
          icon={<Percent size={16} />}
          sub={d.conversionRate == null ? 'No visits in this period' : `${formatNumber(d.paidOrders)} paid orders`}
        />
      </div>

      {d.byDay.length > 0 && (
        <LineChart
          title="Visits over time"
          subtitle="Every store, store + product page opens"
          height={240}
          data={d.byDay.map(p => ({ label: p.date, visits: p.visits }))}
          lines={[{ dataKey: 'visits', label: 'Visits', color: '#174771' }]}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-bone rounded-[10px] px-4 py-4">
          <p className="text-[14px] font-bold text-carbon mb-3">Where visitors came from</p>
          {d.visits === 0 ? (
            <p className="text-[13px] text-slate">No visits in this period.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {d.sources.map(s => (
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
          <p className="text-[14px] font-bold text-carbon mb-3">Busiest stores</p>
          {d.topStores.length === 0 ? (
            <p className="text-[13px] text-slate">No visits in this period.</p>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {d.topStores.map(s => (
                <li key={s.storeId}>
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="text-carbon truncate">{s.name}</span>
                    <span className="text-slate num shrink-0">{formatNumber(s.visits)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bone/70 mt-1 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-orange" style={{ width: `${Math.max(2, Math.round((s.visits / topStoreVisits) * 100))}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
