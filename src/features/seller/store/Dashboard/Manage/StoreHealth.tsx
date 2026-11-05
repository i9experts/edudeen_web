import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock, MinusCircle, Store } from 'lucide-react';
import { Badge, Button, Card, EmptyState, SkeletonBox } from '@/components/comman/ui';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { apiStoreHealth, type StoreHealth, type StoreHealthMetric, type StoreHealthStatus } from '@/api/services/storeDashboard';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

type Range = 30 | 90;
const LIVE_TOPICS = ['orders', 'messaging', 'messages', 'reviews', 'returns', 'catalog'];

const STATUS: Record<StoreHealthStatus, { label: string; color: 'green' | 'yellow' | 'gray'; Icon: typeof CheckCircle2 }> = {
  good:         { label: 'Good',            color: 'green',  Icon: CheckCircle2 },
  attention:    { label: 'Needs attention', color: 'yellow', Icon: AlertCircle },
  insufficient: { label: 'Not enough data', color: 'gray',   Icon: MinusCircle },
  unavailable:  { label: 'Not available yet', color: 'gray', Icon: MinusCircle },
};

function formatValue(m: StoreHealthMetric): string {
  if (m.value === null) return '—';
  if (m.unit === 'percent') return `${m.value}%`;
  if (m.unit === 'stars') return `${m.value.toFixed(1)} ★`;
  if (m.unit === 'count') return String(m.value);
  // minutes -> "45 min", "3 h", "1 d 4 h"
  const min = m.value;
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  if (min < 1440) return `${Math.round((min / 60) * 10) / 10} h`;
  const d = Math.floor(min / 1440);
  const h = Math.round((min % 1440) / 60);
  return h ? `${d} d ${h} h` : `${d} d`;
}

function MetricTile({ m }: { m: StoreHealthMetric }) {
  const s = STATUS[m.status];
  return (
    <Card className="p-4 md:p-5 rounded-2xl flex flex-col gap-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold text-slate min-w-0">{m.label}</p>
        <Badge color={s.color} size="sm" dot>{s.label}</Badge>
      </div>
      <p className="text-[28px] leading-none font-bold text-carbon tabular-nums">{formatValue(m)}</p>
      <p className="text-[12px] text-slate">Target: <span className="font-semibold text-carbon">{m.target}</span></p>
      <p className="text-[12px] text-slate leading-[1.5]">{m.hint}</p>
    </Card>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading store health">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-5 rounded-2xl flex flex-col gap-3">
          <SkeletonBox height={14} width="55%" />
          <SkeletonBox height={28} width="35%" />
          <SkeletonBox height={12} width="70%" />
          <SkeletonBox height={12} width="90%" />
        </Card>
      ))}
    </div>
  );
}

/** Read-only seller health check: same numbers and the same 10-sample minimum as the public store trust strip. */
export function StoreHealthPage() {
  const { storeId } = useStoreWorkspace();
  const [range, setRange] = useState<Range>(30);
  const [data, setData] = useState<StoreHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback((quiet = false) => {
    if (!storeId) return;
    const mine = ++seq.current;
    if (!quiet) { setLoading(true); setError(''); }
    apiStoreHealth(storeId, range)
      .then(res => { if (mine === seq.current) { setData(res.data); setLoading(false); setError(''); } })
      .catch(err => {
        if (mine !== seq.current) return;
        setLoading(false);
        if (!quiet) setError(err instanceof Error ? err.message : 'Could not load your store health.');
      });
  }, [storeId, range]);

  useEffect(() => { setData(null); load(false); }, [load]);
  useLiveRefresh(LIVE_TOPICS, () => load(true), !!storeId);

  return (
    <>
      <StorePageHeader
        title="Store Health"
        subtitle="How buyers experience your store. Read-only: nothing here is a penalty."
      />
      <div className="px-4 md:px-8 pt-6 pb-10 max-w-[1100px] flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Time range" className="inline-flex rounded-xl border border-bone bg-white p-1">
            {([30, 90] as Range[]).map(r => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={`px-4 h-9 rounded-lg text-[13px] font-semibold transition-colors ${range === r ? 'bg-carbon text-white' : 'text-slate hover:bg-mist'}`}
              >
                Last {r} days
              </button>
            ))}
          </div>
          {data && (
            <p className="text-[12px] text-slate flex items-center gap-1.5">
              <Clock size={13} aria-hidden="true" /> Updated every 15 minutes
            </p>
          )}
        </div>

        {loading && !data ? (
          <Skeleton />
        ) : error && !data ? (
          <div role="alert">
            <Card className="p-6 rounded-2xl flex flex-col items-center text-center gap-3">
              <AlertCircle size={28} className="text-error" aria-hidden="true" />
              <p className="text-[14px] font-semibold text-carbon">{error}</p>
              <Button variant="secondary" onClick={() => load(false)}>Retry</Button>
            </Card>
          </div>
        ) : data?.isNew ? (
          <Card className="rounded-2xl">
            <EmptyState
              icon={<Store size={30} className="text-slate" aria-hidden="true" />}
              title="Your health numbers will appear here"
              description={`Once you have orders, buyer chats and reviews, we show how you are doing. Each number needs ${data.minSamples} data points first.`}
            />
          </Card>
        ) : data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.metrics.map(m => <MetricTile key={m.id} m={m} />)}
            </div>
            <p className="text-[12px] text-slate flex items-start gap-1.5 leading-[1.5]">
              <Activity size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              Free claims and digital-only orders are left out of the parcel numbers. These are the same definitions buyers see on your store page.
            </p>
          </>
        ) : null}
      </div>
    </>
  );
}
