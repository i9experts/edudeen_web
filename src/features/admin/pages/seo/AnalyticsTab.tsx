import { MetricCard } from '@/components/comman/ui/MetricCard';
import { Card } from '@/components/comman/ui/Card';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { LineChart } from '@/components/comman/charts';
import { MousePointerClick, Eye, Percent, TrendingUp } from 'lucide-react';
import { useSeoAnalyticsOverview, useSeoSearchPerformance, useSeoOrganicTraffic } from '@/hooks/admin/seo/useSeoAnalytics';

export function AnalyticsTab() {
  const { data: overview, loading: overviewLoading, error, refetch } = useSeoAnalyticsOverview({ days: 28 });
  const { data: perf, loading: perfLoading } = useSeoSearchPerformance({ days: 28 });
  const { data: traffic, loading: trafficLoading } = useSeoOrganicTraffic({ days: 28 });

  if (error) return <AnalyticsErrorState message={error} onRetry={refetch} />;

  const perfSeries = (perf ?? []).map(r => ({ date: r.date, value: r.clicks ?? 0 }));
  const trafficSeries = (traffic ?? []).map(r => ({ date: r.date, value: r.organicSessions ?? 0 }));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <MetricCard label="Clicks (28d)" value={overview?.clicks != null ? overview.clicks.toLocaleString() : '—'} icon={<MousePointerClick size={16} />} loading={overviewLoading} />
        <MetricCard label="Impressions (28d)" value={overview?.impressions != null ? overview.impressions.toLocaleString() : '—'} icon={<Eye size={16} />} loading={overviewLoading} />
        <MetricCard label="Avg CTR" value={overview?.avgCtr != null ? `${(overview.avgCtr * 100).toFixed(1)}%` : '—'} icon={<Percent size={16} />} loading={overviewLoading} />
        <MetricCard label="Organic Sessions (28d)" value={overview?.organicSessions != null ? overview.organicSessions.toLocaleString() : '—'} icon={<TrendingUp size={16} />} loading={overviewLoading} />
      </div>

      <Card>
        <p className="text-[13px] font-semibold text-carbon mb-3">Platform Search Clicks Over Time</p>
        {perfLoading ? (
          <div className="h-[220px] bg-cream animate-pulse rounded-lg" />
        ) : perfSeries.length > 0 ? (
          <LineChart data={perfSeries} xKey="date" lines={[{ dataKey: 'value', label: 'Clicks' }]} height={220} />
        ) : (
          <p className="text-[12px] text-slate py-10 text-center">No search performance data yet — connect Search Console.</p>
        )}
      </Card>

      <Card>
        <p className="text-[13px] font-semibold text-carbon mb-3">Platform Organic Traffic Over Time</p>
        {trafficLoading ? (
          <div className="h-[220px] bg-cream animate-pulse rounded-lg" />
        ) : trafficSeries.length > 0 ? (
          <LineChart data={trafficSeries} xKey="date" lines={[{ dataKey: 'value', label: 'Organic Sessions' }]} height={220} />
        ) : (
          <p className="text-[12px] text-slate py-10 text-center">No organic traffic data yet — connect Google Analytics.</p>
        )}
      </Card>
    </div>
  );
}
