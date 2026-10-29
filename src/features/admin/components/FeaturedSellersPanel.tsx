import { useCallback, useEffect, useState } from 'react';
import { Pin, PinOff, RefreshCw } from 'lucide-react';
import { apiGetFeaturedStores, apiSetStoreFeaturedRank, type FeaturedStoreRow } from '@/api/services/marketplace/adminMarketplace';
import { Button, SkeletonBox } from '@/components/comman/ui';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { useBusyAction } from '@/hooks/useBusyAction';

/** Admin: see every store's Featured score (what the home rail is ranked by) and pin stores to the front. */
export function FeaturedSellersPanel() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<FeaturedStoreRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rankInput, setRankInput] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const { run, busy } = useBusyAction();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiGetFeaturedStores()
      .then(r => setRows(r.data?.stores ?? []))
      .catch(e => setError(e?.response?.data?.message ?? 'Could not load stores.'))
      .finally(() => setLoading(false));
  }, []);

  // Nothing is fetched until the admin opens the section.
  useEffect(() => { if (open && rows === null && !loading) load(); }, [open, rows, loading, load]);

  const pin = (row: FeaturedStoreRow, rank: number | null) => {
    setMsg(null);
    void run(async () => {
      try {
        await apiSetStoreFeaturedRank(row.storeId, rank);
        setMsg(rank === null ? `${row.name} unpinned.` : `${row.name} pinned at position ${rank}. The home page updates within about 10 minutes.`);
        load();
      } catch (e: any) {
        setMsg(e?.response?.data?.message ?? 'Could not save.');
      }
    });
  };

  return (
    <section className="bg-white border border-bone rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-[14px] text-start cursor-pointer bg-transparent border-0">
        <span>
          <span className="block text-[14px] font-semibold text-carbon">Featured sellers (home page)</span>
          <span className="block text-[12px] text-slate">Stores are ranked by score (rating, sales, followers, profile, recent activity). Pin a store to put it first.</span>
        </span>
        <span className="text-[12px] text-slate">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="border-t border-bone p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[12px] text-slate">Score is 0-100. “Needs profile” = no logo, fewer than 3 products, or no bio: it only shows on the rail when too few stores qualify (or when pinned).</p>
            <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={load} loading={loading}>Refresh</Button>
          </div>
          {msg && <div role="status" className="rounded-lg border border-info/30 bg-info-bg px-3 py-2 text-[12.5px] text-carbon">{msg}</div>}
          {error ? <AnalyticsErrorState message={error} onRetry={load} />
            : rows === null ? <SkeletonBox height={160} rounded="10px" />
            : rows.length === 0 ? <p className="text-[13px] text-slate">No active stores yet.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[12.5px]">
                  <thead>
                    <tr className="text-start text-slate border-b border-bone">
                      <th className="py-2 pe-3 text-start font-medium">Store</th>
                      <th className="py-2 pe-3 text-start font-medium">Score</th>
                      <th className="py-2 pe-3 text-start font-medium">Rating</th>
                      <th className="py-2 pe-3 text-start font-medium">Sold</th>
                      <th className="py-2 pe-3 text-start font-medium">Items</th>
                      <th className="py-2 pe-3 text-start font-medium">Followers</th>
                      <th className="py-2 text-start font-medium">Pin position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const typed = rankInput[r.storeId] ?? '';
                      const n = Number(typed);
                      const valid = Number.isInteger(n) && n >= 1 && n <= 999;
                      return (
                        <tr key={r.storeId} className="border-b border-bone/60 last:border-0">
                          <td className="py-2 pe-3">
                            <span className="font-medium text-carbon">{r.name}</span>
                            {r.featuredRank !== null && <span className="ms-2 rounded-full bg-info-bg px-2 py-[1px] text-[11px] text-info">Pinned #{r.featuredRank}</span>}
                            {!r.qualityOk && <span className="ms-2 rounded-full bg-warning-bg px-2 py-[1px] text-[11px] text-warning">Needs profile</span>}
                          </td>
                          <td className="py-2 pe-3 font-semibold text-carbon">{r.score.toFixed(1)}</td>
                          <td className="py-2 pe-3">{r.averageRating > 0 ? `${r.averageRating.toFixed(1)} (${r.reviewCount})` : '—'}</td>
                          <td className="py-2 pe-3">{r.soldCount}</td>
                          <td className="py-2 pe-3">{r.publishedProducts}</td>
                          <td className="py-2 pe-3">{r.followersCount}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="number" min={1} max={999} inputMode="numeric"
                                aria-label={`Pin position for ${r.name}`}
                                value={typed}
                                placeholder={r.featuredRank !== null ? String(r.featuredRank) : '#'}
                                onChange={e => setRankInput(s => ({ ...s, [r.storeId]: e.target.value }))}
                                className="h-8 w-16 rounded-md border border-bone px-2 text-[12.5px]"
                              />
                              <Button size="xs" variant="outline" icon={<Pin size={11} />} disabled={!valid || busy} onClick={() => { pin(r, n); setRankInput(s => ({ ...s, [r.storeId]: '' })); }}>Pin</Button>
                              {r.featuredRank !== null && (
                                <Button size="xs" variant="ghost" icon={<PinOff size={11} />} disabled={busy} onClick={() => pin(r, null)}>Unpin</Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}
    </section>
  );
}
