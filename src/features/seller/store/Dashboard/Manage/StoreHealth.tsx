import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertCircle, ArrowRight, CheckCircle2, Clock, Lightbulb, MinusCircle, Store } from 'lucide-react';
import { Badge, Button, Card, EmptyState, SkeletonBox } from '@/components/comman/ui';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { apiStoreHealth, type StoreHealth, type StoreHealthMetric, type StoreHealthStatus } from '@/api/services/storeDashboard';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { relAgo } from '@/utils/localeTime';

type Range = 30 | 90;
type MetricId = StoreHealthMetric['id'];
const LIVE_TOPICS = ['orders', 'messaging', 'messages', 'reviews', 'returns', 'catalog'];

const STATUS: Record<StoreHealthStatus, { label: string; color: 'green' | 'yellow' | 'gray'; Icon: typeof CheckCircle2 }> = {
  good:         { label: 'Good',            color: 'green',  Icon: CheckCircle2 },
  attention:    { label: 'Needs attention', color: 'yellow', Icon: AlertCircle },
  insufficient: { label: 'Not enough data', color: 'gray',   Icon: MinusCircle },
  unavailable:  { label: 'Not available yet', color: 'gray', Icon: MinusCircle },
};

/** One action link (existing query params only) + one static "how to improve" line per metric. */
const GUIDE: Record<MetricId, { improve: string; unit: string; action?: { label: string; path: string } }> = {
  dispatch:     { improve: 'Ship within 48 hours of payment. Add tracking right away and mark each parcel shipped.', unit: 'orders', action: { label: 'View overdue orders', path: 'orders?action=overdue' } },
  cancellation: { improve: 'Only cancel when you truly cannot ship. Keep stock counts up to date so orders can be fulfilled.', unit: 'orders' },
  returns:      { improve: 'Describe items clearly with real photos and sizes, and pack them well to avoid damage.', unit: 'items', action: { label: 'View return requests', path: 'returns?status=requested' } },
  responseRate: { improve: 'Answer buyer chats within 24 hours. Open the unread chats first.', unit: 'chats', action: { label: 'View chats waiting for a reply', path: 'messages?filter=unread' } },
  replyTime:    { improve: 'Reply early in the day. Even a short answer starts the clock in your favour.', unit: 'chats', action: { label: 'View chats waiting for a reply', path: 'messages?filter=unread' } },
  rating:       { improve: 'Ask buyers for a review after delivery and answer feedback politely.', unit: 'reviews', action: { label: 'View reviews', path: 'reviews' } },
  sentBack:     { improve: 'Open each sent-back listing, fix what the note asks for, then publish again.', unit: 'items', action: { label: 'View listings sent back', path: 'products?status=rejected' } },
};

const PARCEL_IDS: MetricId[] = ['dispatch', 'cancellation', 'returns'];

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

/** "Last updated 5 min ago" from the response's generatedAt (Urdu-aware via localeTime). */
function updatedText(iso: string | undefined, now: number): string {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (Number.isNaN(t)) return '';
  const min = Math.max(0, Math.floor((now - t) / 60_000));
  if (min < 1) return 'Just now';
  if (min < 60) return relAgo(min, 'min');
  if (min < 1440) return relAgo(Math.floor(min / 60), 'h');
  return relAgo(Math.floor(min / 1440), 'd');
}

function MetricTile({ m, base, sentBack }: { m: StoreHealthMetric; base: string; sentBack?: StoreHealth['sentBackItems'] }) {
  const s = STATUS[m.status];
  const g = GUIDE[m.id];
  const sampleSize = m.sampleSize ?? m.sample;
  const minSample = m.minSample ?? 0;
  const building = m.status === 'insufficient' && minSample > 0 && sampleSize < minSample;
  const titleId = `health-${m.id}`;
  const items = m.id === 'sentBack' ? (sentBack ?? []) : [];
  const more = m.id === 'sentBack' ? Math.max(0, (m.value ?? 0) - items.length) : 0;

  return (
    <Card className="p-4 md:p-5 rounded-2xl flex flex-col gap-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <h2 id={titleId} className="text-[13px] font-semibold text-slate min-w-0">{m.label}</h2>
        <Badge color={s.color} size="sm" dot>{s.label}</Badge>
      </div>
      <p className="text-[28px] leading-none font-bold text-carbon tabular-nums">{formatValue(m)}</p>
      {building && (
        <p className="text-[12px] font-semibold text-carbon">{`${sampleSize} of ${minSample} ${g.unit}`}</p>
      )}
      <p className="text-[12px] text-slate">Target: <span className="font-semibold text-carbon">{m.target}</span></p>
      <p className="text-[12px] text-slate leading-[1.5]">{m.hint}</p>
      {m.countedFrom && (
        <p className="text-[12px] text-slate">
          {`Counted from ${new Date(m.countedFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' })}`}
        </p>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col gap-2 min-w-0">
          {items.map(it => (
            <li key={it.id} className="rounded-xl bg-mist px-3 py-2 min-w-0">
              <p className="text-[13px] font-semibold text-carbon truncate" translate="no">{it.title}</p>
              {it.note && <p className="text-[12px] text-slate leading-[1.5] break-words" translate="no">{it.note}</p>}
            </li>
          ))}
          {more > 0 && (
            <li>
              <Link to={`${base}/products?status=rejected`} className="text-[12px] font-semibold text-brand-royal hover:underline">{`+${more} more`}</Link>
            </li>
          )}
        </ul>
      )}

      {m.status !== 'unavailable' && (
        <p className="text-[12px] text-slate leading-[1.5] flex items-start gap-1.5">
          <Lightbulb size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span><span className="font-semibold text-carbon">How to improve</span>{': '}{g.improve}</span>
        </p>
      )}

      {g.action && (
        <Link
          to={`${base}/${g.action.path}`}
          aria-label={`${g.action.label} — ${m.label}`}
          className="mt-auto inline-flex items-center gap-1 text-[13px] font-semibold text-brand-royal hover:underline"
        >
          {g.action.label} <ArrowRight size={14} aria-hidden="true" className="rtl:rotate-180" />
        </Link>
      )}
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

function StatusBanner({ metrics }: { metrics: StoreHealthMetric[] }) {
  const attention = metrics.filter(m => m.status === 'attention').length;
  const anyGood = metrics.some(m => m.status === 'good');
  const kind = attention > 0 ? 'attention' : anyGood ? 'good' : 'building';
  const text = kind === 'attention' ? `${attention} need attention` : kind === 'good' ? 'All good' : 'Building history';
  const style = kind === 'attention' ? 'bg-warning/10 border-warning/40 text-carbon' : kind === 'good' ? 'bg-success/10 border-success/40 text-carbon' : 'bg-mist border-bone text-carbon';
  const Icon = kind === 'attention' ? AlertCircle : kind === 'good' ? CheckCircle2 : MinusCircle;
  return (
    <div role="status" className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-[14px] font-semibold ${style}`}>
      <Icon size={18} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

function StartChecklist({ base }: { base: string }) {
  const steps = [
    { label: 'Add products to your store', to: `${base}/products/add` },
    { label: 'Set up shipping', to: `${base}/shipping` },
    { label: 'Reply to buyers within 24 hours', to: `${base}/messages` },
    { label: 'Ask happy buyers for reviews', to: `${base}/reviews` },
  ];
  return (
    <Card className="p-4 md:p-5 rounded-2xl flex flex-col gap-3">
      <h2 className="text-[14px] font-semibold text-carbon">Get started: how to build your health numbers</h2>
      <ul className="flex flex-col gap-2">
        {steps.map(s => (
          <li key={s.to}>
            <Link to={s.to} className="flex items-center justify-between gap-2 rounded-xl border border-bone px-3 py-2.5 text-[13px] font-semibold text-carbon hover:bg-mist">
              <span className="min-w-0">{s.label}</span>
              <ArrowRight size={14} aria-hidden="true" className="shrink-0 rtl:rotate-180" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Read-only seller health check: same numbers and the same 10-sample minimum as the public store trust strip. */
export function StoreHealthPage() {
  const { storeId } = useStoreWorkspace();
  const [range, setRange] = useState<Range>(30);
  const [data, setData] = useState<StoreHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const seq = useRef(0);
  const base = `/store/${storeId}`;

  const load = useCallback((quiet = false) => {
    if (!storeId) return;
    const mine = ++seq.current;
    if (!quiet) { setLoading(true); setError(''); }
    apiStoreHealth(storeId, range)
      .then(res => { if (mine === seq.current) { setData(res.data); setLoading(false); setError(''); setNow(Date.now()); } })
      .catch(err => {
        if (mine !== seq.current) return;
        setLoading(false);
        if (!quiet) setError(err instanceof Error ? err.message : 'Could not load your store health.');
      });
  }, [storeId, range]);

  useEffect(() => { setData(null); load(false); }, [load]);
  useLiveRefresh(LIVE_TOPICS, () => load(true), !!storeId);
  // Keep "Last updated" fresh without refetching.
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);

  const noParcelData = useMemo(
    () => !!data && data.metrics.filter(m => PARCEL_IDS.includes(m.id)).every(m => m.value === null),
    [data],
  );
  const updated = data ? updatedText(data.generatedAt, now) : '';

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
              <Clock size={13} aria-hidden="true" /> {`Last updated ${updated}`}
            </p>
          )}
        </div>

        {/* Polite live region: range changes and refreshed numbers are announced to screen readers. */}
        <div aria-live="polite" className="flex flex-col gap-5 min-w-0">
          {data && <span className="sr-only">{`Showing the last ${data.range} days`}</span>}

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
            <>
              <Card className="rounded-2xl">
                <EmptyState
                  icon={<Store size={30} className="text-slate" aria-hidden="true" />}
                  title="Your health numbers will appear here"
                  description={`Once you have orders, buyer chats and reviews, we show how you are doing. Each number needs ${data.minSamples} data points first.`}
                />
              </Card>
              <StartChecklist base={base} />
            </>
          ) : data ? (
            <>
              <StatusBanner metrics={data.metrics} />
              {noParcelData && <StartChecklist base={base} />}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {data.metrics.map(m => <MetricTile key={m.id} m={m} base={base} sentBack={data.sentBackItems} />)}
              </div>
              <p className="text-[12px] text-slate flex items-start gap-1.5 leading-[1.5]">
                <Activity size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                Free claims and digital-only orders are left out of the parcel numbers. These are the same definitions buyers see on your store page.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
