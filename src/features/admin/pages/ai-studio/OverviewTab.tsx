import { MetricCard } from '@/components/comman/ui/MetricCard';
import { Card } from '@/components/comman/ui/Card';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { Sparkles, CheckCircle2, Coins, ListChecks } from 'lucide-react';
import { useAdminAiStudioOverview } from '@/hooks/admin/useAdminAiStudio';

const TOOL_LABELS: Record<string, string> = {
  listing_writer: 'Listing Writer',
  price_optimizer: 'Price Optimizer',
  worksheet_builder: 'Worksheet Builder',
  seo_booster: 'SEO Booster',
  email_campaigns: 'Email Campaigns',
  image_enhancer: 'Image Enhancer',
};

export function OverviewTab() {
  const { data, loading, error, refetch } = useAdminAiStudioOverview(28);

  if (error) return <AnalyticsErrorState message={error} onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <MetricCard label="Generations (28d)" value={data?.totalGenerations ?? 0} icon={<Sparkles size={16} />} loading={loading} />
        <MetricCard label="Success Rate" value={`${data?.successRate ?? 0}%`} icon={<CheckCircle2 size={16} />} loading={loading} />
        <MetricCard label="Credits Spent (28d)" value={(data?.totalCreditsSpent ?? 0).toLocaleString()} icon={<Coins size={16} />} loading={loading} />
        <MetricCard label="Captured Transactions" value={data?.capturedTransactionCount ?? 0} icon={<ListChecks size={16} />} loading={loading} />
      </div>

      <Card>
        <p className="text-[13px] font-semibold text-carbon mb-3">Adoption by Tool</p>
        {loading ? (
          <p className="text-[12px] text-slate">Loading…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {Object.entries(data?.byTool ?? {}).map(([tool, counts]) => {
              const total = counts.succeeded + counts.failed + counts.processing;
              return (
                <div key={tool} className="flex items-center justify-between gap-3 py-2 border-b border-bone last:border-b-0">
                  <span className="text-[13px] text-carbon truncate min-w-0">{TOOL_LABELS[tool] ?? tool}</span>
                  <div className="flex items-center gap-3 text-[11px] shrink-0">
                    <span className="text-success">{counts.succeeded} succeeded</span>
                    <span className="text-error">{counts.failed} failed</span>
                    <span className="text-slate">{total} total</span>
                  </div>
                </div>
              );
            })}
            {Object.keys(data?.byTool ?? {}).length === 0 && (
              <p className="text-[12px] text-slate py-4 text-center">No generations in the last 28 days.</p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <p className="text-[13px] font-semibold text-carbon mb-3">Top Stores by Usage</p>
        {loading ? (
          <p className="text-[12px] text-slate">Loading…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(data?.topStores ?? []).map(store => (
              <div key={store.storeId} className="flex items-center justify-between py-2 border-b border-bone last:border-b-0">
                <div className="min-w-0">
                  <p className="text-[13px] text-carbon truncate">{store.storeName ?? store.storeId}</p>
                  {store.storeSlug && <p className="text-[11px] text-slate">/{store.storeSlug}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-semibold text-carbon">{store.generations} gen.</p>
                  <p className="text-[11px] text-slate">{store.creditsCharged} credits</p>
                </div>
              </div>
            ))}
            {(data?.topStores ?? []).length === 0 && (
              <p className="text-[12px] text-slate py-4 text-center">No store activity in the last 28 days.</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
