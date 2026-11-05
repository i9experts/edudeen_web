import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Star } from 'lucide-react';
import { apiGetStoreReviewsPage, type StoreReviewsPage } from '@/api/services/publicStoreReviews';

const USED_FOR: Record<string, string> = { home: 'Used at home', classroom: 'Used in class', school: 'Used in school' };

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={14} className={i <= value ? 'fill-brand-orange text-brand-orange' : 'text-bone'} aria-hidden />
      ))}
    </span>
  );
}

/** Read-only list of the store's latest buyer reviews (all star levels), newest first, paginated. */
export function StoreReviewsTab({ storeId }: { storeId: string }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<StoreReviewsPage | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: number) => {
    setLoading(true);
    setError('');
    apiGetStoreReviewsPage(storeId, p, 10)
      .then(res => setData(res.data))
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load reviews.'))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(page); }, [load, page]);

  const reviews = data?.reviews ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 max-w-[1480px] mx-auto w-full">
      {loading && !data && (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-bone/60 animate-pulse" />)}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-2xl border border-bone bg-white px-5 py-4 text-[13.5px]">
          <p className="text-error mb-2">{error}</p>
          <button type="button" onClick={() => load(page)} className="text-brand-royal font-semibold underline">Try again</button>
        </div>
      )}

      {!error && data && reviews.length === 0 && (
        <p className="rounded-2xl border border-bone bg-white px-5 py-8 text-center text-[14px] text-slate">No reviews yet</p>
      )}

      {!error && reviews.length > 0 && (
        <ul className={`flex flex-col gap-3 ${loading ? 'opacity-60' : ''}`}>
          {reviews.map(r => (
            <li key={r.reviewId} className="rounded-2xl border border-bone bg-white px-5 py-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Stars value={r.rating} />
                <span className="text-[13.5px] font-semibold text-carbon">{r.customerName}</span>
                {r.isVerifiedPurchase && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-success">
                    <BadgeCheck size={12} aria-hidden /> Verified purchase
                  </span>
                )}
                <span className="text-[12px] text-slate ms-auto">
                  {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {r.product?.title && <p className="text-[12px] text-slate mt-1 break-words" translate="no">{r.product.title}</p>}
              {r.usedFor && USED_FOR[r.usedFor] && <p className="text-[12px] text-slate mt-0.5">{USED_FOR[r.usedFor]}</p>}
              {r.comment && <p className="text-[14px] text-graphite mt-2 leading-relaxed whitespace-pre-line break-words">{r.comment}</p>}
              {r.sellerReply && (
                <div className="mt-3 ms-3 ps-3 border-s-2 border-bone">
                  <p className="text-[12px] font-semibold text-slate">Seller reply</p>
                  <p className="text-[13px] text-graphite break-words whitespace-pre-line">{r.sellerReply.text}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && !error && (
        <nav aria-label="Reviews pages" className="mt-5 flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-lg border border-bone bg-white text-[13px] font-semibold text-carbon disabled:opacity-40">Previous</button>
          <span className="text-[13px] text-slate">Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-lg border border-bone bg-white text-[13px] font-semibold text-carbon disabled:opacity-40">Next</button>
        </nav>
      )}
    </div>
  );
}
