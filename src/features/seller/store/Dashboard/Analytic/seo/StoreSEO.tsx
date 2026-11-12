import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, ImageOff, Wrench, Store as StoreIcon } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { Card } from '@/components/comman/ui/Card';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ScoreBadge } from '@/components/comman/seo';
import { apiSearchVisibility, type SearchVisibilityData } from '@/api/services/seo/seller/products.service';
import { errorMessage } from '@/utils/bulkRun';

const PAGE_SIZE = 20;

/** Deep link into the product editor at the step + field that fixes one problem (Edit page reads ?step=&field=). */
function fixLink(storeId: string, productId: string, fix: { step: number; fieldId: string }) {
  return `/store/${storeId}/products/edit/${productId}?step=${fix.step}&field=${encodeURIComponent(fix.fieldId)}`;
}

/**
 * One page: how easy each product is to find in search, and exactly what to fix. The older SEO Center tabs
 * (category, pages, search console, analytics, audit, overview) are no longer shown to sellers; their API routes stay.
 */
export function StoreSEO() {
  usePageTitle('Search Visibility');
  const { storeId, store } = useStoreWorkspace();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SearchVisibilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    let alive = true;
    setLoading(true); setError('');
    apiSearchVisibility(storeId, { page, limit: PAGE_SIZE })
      .then(r => { if (alive) setData(r.data); })
      .catch(e => { if (alive) setError(errorMessage(e) || 'Could not load your products.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [storeId, page]);

  useEffect(() => load(), [load]);

  const items = data?.items ?? [];
  const pages = data?.pagination.pages ?? 1;

  return (
    <>
      <StorePageHeader
        title="Search Visibility"
        subtitle="How easy buyers find your products on Google and Edudeen, and what to fix."
        eyebrow=""
        wrapSubtitle
      />

      <div className="px-4 md:px-7 pb-8 pt-5 flex flex-col gap-4 max-w-[980px]">
        <StoreSearchCard storeId={storeId} name={store?.name} logo={store?.logo} description={(store as { description?: string } | null)?.description} />

        {data && (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Products" value={String(data.summary.totalProducts)} />
            <Stat label="Need attention" value={String(data.summary.needFix)} tone={data.summary.needFix ? 'warn' : 'ok'} />
            <Stat label="Average score" value={data.summary.avgScore === null ? '—' : `${data.summary.avgScore}`} />
          </div>
        )}

        {error ? (
          <AnalyticsErrorState message={error} onRetry={load} />
        ) : loading && !data ? (
          <ListSkeleton />
        ) : items.length === 0 ? (
          <Card className="flex flex-col items-center text-center gap-2 py-10">
            <CheckCircle2 size={28} className="text-success" />
            <p className="text-[15px] font-bold text-carbon m-0">All good, nothing to fix</p>
            <p className="text-[13px] text-slate m-0 max-w-[420px]">
              {data && data.summary.totalProducts === 0
                ? 'Add your first product and it will be checked here.'
                : 'Every product has a clear title, description, photos and class details.'}
            </p>
          </Card>
        ) : (
          <div className={`flex flex-col gap-3 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
            {items.map(p => (
              <Card key={p._id} className="flex flex-col gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-12 rounded-lg bg-cream border border-bone overflow-hidden shrink-0 flex items-center justify-center">
                    {p.image ? <img src={p.image} alt="" loading="lazy" className="w-full h-full object-cover" /> : <ImageOff size={16} className="text-slate" />}
                  </div>
                  <p className="text-[14px] font-semibold text-carbon m-0 min-w-0 flex-1 break-words line-clamp-2">{p.name}</p>
                  <ScoreBadge score={p.score} />
                </div>
                <ul className="list-none m-0 p-0 flex flex-col gap-2">
                  {p.missing.map(m => (
                    <li key={m.key} className="flex items-center justify-between gap-3 bg-cream rounded-lg ps-3 pe-1.5 py-1.5">
                      <span className="text-[13px] text-carbon min-w-0 break-words">{m.label}</span>
                      <Link
                        to={fixLink(storeId, p._id, m.fix)}
                        className="shrink-0 inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-white border border-bone text-[13px] font-semibold text-brand-orange hover:bg-brand-pale-orange"
                      >
                        <Wrench size={13} /> Fix
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}

            {pages > 1 && (
              <nav className="flex items-center justify-between gap-3 pt-1" aria-label="Pages">
                <button type="button" data-compact disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="min-h-[44px] px-4 rounded-lg border border-bone bg-white text-[13px] font-semibold text-carbon disabled:opacity-40 inline-flex items-center gap-1">
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className="text-[12.5px] text-slate">Page {page} of {pages}</span>
                <button type="button" data-compact disabled={page >= pages || loading} onClick={() => setPage(p => Math.min(pages, p + 1))}
                  className="min-h-[44px] px-4 rounded-lg border border-bone bg-white text-[13px] font-semibold text-carbon disabled:opacity-40 inline-flex items-center gap-1">
                  Next <ChevronRight size={14} />
                </button>
              </nav>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="bg-white border border-bone rounded-xl px-3 py-3 min-w-0">
      <p className="text-[12px] text-slate m-0">{label}</p>
      <p className={`text-[22px] font-serif m-0 ${tone === 'warn' ? 'text-[#b45309]' : tone === 'ok' ? 'text-success' : 'text-carbon'}`}>{value}</p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading products">
      {[0, 1, 2].map(i => <div key={i} className="h-[132px] rounded-xl bg-cream animate-pulse" />)}
    </div>
  );
}

/** Store name / description / logo already live in Store Settings: show their state here and link, no second form. */
function StoreSearchCard({ storeId, name, logo, description }: { storeId: string; name?: string; logo?: string | null; description?: string }) {
  const descLen = (description ?? '').trim().length;
  const checks = [
    { ok: !!name?.trim(), text: 'Store name' },
    { ok: descLen >= 50, text: descLen ? `Store description (${descLen} characters, 50+ is best)` : 'Store description' },
    { ok: !!logo, text: 'Store logo' },
  ];
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <StoreIcon size={16} className="text-brand-orange" />
        <p className="text-[14px] font-bold text-carbon m-0">Your store in search</p>
      </div>
      <ul className="list-none m-0 p-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {checks.map(c => (
          <li key={c.text} className={`text-[13px] rounded-lg px-3 py-2 ${c.ok ? 'bg-[#eef8f1] text-[#1f6b3a]' : 'bg-[#fff6d6] text-[#8a6100]'}`}>
            {c.ok ? '✓ ' : '! '}{c.text}
          </li>
        ))}
      </ul>
      <Link to={`/store/${storeId}/settings`} className="self-start inline-flex items-center min-h-[44px] text-[13px] font-semibold text-brand-orange hover:underline">
        Edit name, description and logo in Store Settings
      </Link>
    </Card>
  );
}
