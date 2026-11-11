import { useEffect, useState } from 'react';
import { Card, SkeletonBox, Button, StarRating, Badge } from '@/components/comman/ui';
import { BadgeCheck, CheckCircle2, Circle } from 'lucide-react';
import { apiGetStoreInsights, type StoreInsights } from '@/api/services/rating';

function Trend({ points }: { points: StoreInsights['trend'] }) {
  const pts = points.filter(p => p.avgRating != null);
  if (pts.length < 2) return <p className="text-[12px] text-slate">Not enough weeks to draw a trend yet.</p>;
  const W = 320, H = 90, P = 8;
  const xs = (i: number) => P + (i * (W - 2 * P)) / (pts.length - 1);
  const ys = (v: number) => P + ((5 - v) * (H - 2 * P)) / 4; // 1..5 scale
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(p.avgRating as number).toFixed(1)}`).join(' ');
  const label = `Average rating by week, from ${pts[0].avgRating} to ${pts[pts.length - 1].avgRating}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full h-[90px]">
      {[5, 4, 3].map(v => <line key={v} x1={P} x2={W - P} y1={ys(v)} y2={ys(v)} stroke="currentColor" className="text-bone" strokeDasharray="3 3" />)}
      <path d={d} fill="none" stroke="#2F6AA8" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={p.weekStart} cx={xs(i)} cy={ys(p.avgRating as number)} r={3} fill="#2F6AA8"><title>{`${new Date(p.weekStart).toLocaleDateString()}: ${p.avgRating} (${p.count})`}</title></circle>)}
    </svg>
  );
}

export function ReviewInsights({ storeId, onPickProduct }: { storeId: string; onPickProduct: (productId: string) => void }) {
  const [range, setRange] = useState<30 | 90>(30);
  const [data, setData] = useState<StoreInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    apiGetStoreInsights(storeId, range)
      .then(r => { if (alive) setData(r.data); })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Could not load insights.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [storeId, range, tick]);

  const diff = data && data.current.avgRating != null && data.previous.avgRating != null
    ? Math.round((data.current.avgRating - data.previous.avgRating) * 100) / 100 : null;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <p className="text-[14px] font-semibold text-charcoal">Reputation insights</p>
        <div role="group" aria-label="Period" className="inline-flex rounded-lg border border-bone overflow-hidden">
          {([30, 90] as const).map(r => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}
              className={`px-3 min-h-[36px] text-[12px] font-semibold border-0 cursor-pointer ${range === r ? 'bg-brand-royal text-white' : 'bg-white text-graphite'}`}>
              Last {r} days
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="text-[13px] text-error flex items-center gap-3">{error}<Button size="sm" variant="secondary" onClick={() => setTick(t => t + 1)}>Retry</Button></div>
      ) : loading && !data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><SkeletonBox height={170} rounded="10px" /><SkeletonBox height={170} rounded="10px" /></div>
      ) : data && (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-5 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <div className="min-w-0">
            {!data.enough ? (
              <p className="text-[13px] text-slate py-6">Not enough data yet. Insights appear after 3 reviews in this period.</p>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[22px] font-bold text-charcoal">{data.current.avgRating?.toFixed(2)}</span>
                  <span className="text-[12px] text-slate">average · {data.current.count} reviews</span>
                  {diff != null && diff !== 0 && (
                    <span className={`text-[12px] font-semibold ${diff > 0 ? 'text-success' : 'text-error'}`}>{diff > 0 ? '+' : ''}{diff} vs previous {data.range} days</span>
                  )}
                </div>
                <Trend points={data.trend} />
                <p className="text-[12px] font-semibold text-graphite mt-4 mb-2">Lowest rated products (3+ reviews)</p>
                {data.products.length === 0 ? <p className="text-[12px] text-slate">No product has 3 reviews in this period yet.</p> : (
                  <ul className="list-none p-0 m-0 flex flex-col divide-y divide-bone">
                    {data.products.slice(0, 6).map(p => (
                      <li key={p.productId} className="flex items-center gap-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] text-charcoal truncate">{p.title}</p>
                          <p className="text-[12px] text-slate">{p.count} reviews · {p.lowStarCount} low (1-2★)</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0"><StarRating value={p.avgRating ?? 0} size={11} /><span className="text-[12px] font-semibold">{p.avgRating?.toFixed(1)}</span></div>
                        <Button size="sm" variant="secondary" onClick={() => onPickProduct(p.productId)}>View</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="min-w-0 rounded-xl bg-cream p-4">
            <div className="flex items-center gap-2 mb-1">
              <BadgeCheck size={18} className={data.trusted.qualifies ? 'text-success' : 'text-slate'} />
              <p className="text-[14px] font-semibold text-charcoal">Trusted Seller progress</p>
              {data.trusted.qualifies && <Badge color="green">All targets met</Badge>}
            </div>
            <p className="text-[12px] text-slate mb-3">Hit every target to qualify for the Trusted Seller badge{data.trusted.badgePublic ? '' : ' (not shown on your store page yet)'}.</p>
            <ul className="list-none p-0 m-0 flex flex-col gap-2">
              {data.trusted.items.map(t => (
                <li key={t.key} className="flex items-center gap-2 text-[13px]">
                  {t.met ? <CheckCircle2 size={16} className="text-success shrink-0" /> : <Circle size={16} className="text-slate shrink-0" />}
                  <span className="flex-1 text-charcoal">{t.label}</span>
                  <span className="text-slate text-[12px]">{t.value == null ? '—' : t.value} / {t.key === 'replyTime' ? `≤ ${t.target}` : t.key === 'responseRate' ? `≥ ${t.target}%` : `≥ ${t.target}`}</span>
                  <span className={`text-[12px] font-semibold w-[58px] text-end ${t.met ? 'text-success' : 'text-slate'}`}>{t.met ? 'Met' : 'Not met'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
